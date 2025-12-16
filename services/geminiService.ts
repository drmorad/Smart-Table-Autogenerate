import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { TableTemplate, SimulationConfig, RowData } from '../types';
import { COMMON_VALIDATION_RULES, ANOMALY_SCENARIOS } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry an operation with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>, 
  retries = 5, // Increased retries to handle strict rate limits
  baseDelay = 3000, 
  maxDelay = 120000 // Increased max delay to 2 minutes
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Extract error code from various possible structures in the error object
    const code = error?.error?.code || error?.code || error?.status;
    const message = error?.message || error?.error?.message || '';
    const statusText = error?.statusText || error?.response?.statusText || '';
    
    // Check for 503 (Service Unavailable), 429 (Too Many Requests), or RESOURCE_EXHAUSTED
    const isRetriable = 
      code == 503 || 
      code == 429 || 
      code === 'UNAVAILABLE' || 
      code === 'RESOURCE_EXHAUSTED' ||
      statusText.includes('Overloaded') ||
      (typeof message === 'string' && (message.toLowerCase().includes('quota') || message.includes('overloaded') || message.includes('429')));
    
    if (retries > 0 && isRetriable) {
      let delay = baseDelay * (1 + Math.random() * 0.5); // Default jitter

      // 1. Try to extract explicit retry delay from error details (standard Google RPC format)
      const details = error?.error?.details || error?.details;
      if (Array.isArray(details)) {
        const retryInfo = details.find((d: any) => d['@type']?.includes('RetryInfo'));
        if (retryInfo && retryInfo.retryDelay) {
           const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
           if (!isNaN(seconds)) {
               delay = (seconds * 1000) + 2000; // Add 2s buffer
           }
        }
      }

      // 2. Try to extract from message string (fallback)
      // Message format often: "Please retry in 53.759589992s."
      if (typeof message === 'string') {
          const match = message.match(/retry in ([\d.]+)s/);
          if (match && match[1]) {
               const seconds = parseFloat(match[1]);
               if (!isNaN(seconds)) {
                   delay = (seconds * 1000) + 2000;
               }
          }
      }
      
      // Cap the delay
      delay = Math.min(delay, maxDelay);

      console.warn(`Gemini API rate limited (Code: ${code}). Retrying in ${Math.round(delay)}ms... (Attempts left: ${retries})`);
      
      await wait(delay);
      // Pass the calculated delay (or a slightly larger base) for the next iteration if this one fails again
      return retryWithBackoff(operation, retries - 1, Math.min(baseDelay * 2, maxDelay), maxDelay);
    }
    
    // If not retriable or retries exhausted, throw the error
    throw error;
  }
};

export const generateTableData = async (
  template: TableTemplate,
  config: SimulationConfig,
  currentRows: RowData[],
  onProgress?: (message: string) => void
): Promise<RowData[]> => {
  const client = getClient();
  
  // Construct a dynamic schema based on columns
  // We want an array of objects
  const properties: Record<string, Schema> = {};
  const requiredFields: string[] = [];

  template.columns.forEach(col => {
    properties[col.key] = {
      type: col.type === 'number' ? Type.NUMBER : Type.STRING,
      nullable: true,
      description: `Column: ${col.label} ${col.subLabel ? `(${col.subLabel})` : ''}. Group: ${col.group || 'None'}`
    };
    requiredFields.push(col.key);
  });

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: properties,
      required: requiredFields, 
    }
  };

  const targetDateStr = config.targetMonth || new Date().toISOString().slice(0, 7);

  // Split generation into batches to avoid Timeouts/Rate Limits on large outputs
  // INCREASED BATCH SIZE: 12 -> 40 to fit most monthly logs (31 rows) in a single request.
  // This drastically reduces the number of API calls, avoiding RPM limits.
  const BATCH_SIZE = 40; 
  const totalRows = template.defaultRows;
  const batches = Math.ceil(totalRows / BATCH_SIZE);
  let allRows: RowData[] = [];

  for (let i = 0; i < batches; i++) {
    const rowsRemaining = totalRows - allRows.length;
    const currentBatchSize = Math.min(BATCH_SIZE, rowsRemaining);
    const startDay = (i * BATCH_SIZE) + 1;

    if (onProgress) {
        onProgress(`Generating batch ${i + 1} of ${batches}...`);
    }

    // Pause between batches if we have multiple to be kind to the rate limiter
    if (i > 0) {
        await wait(2000); 
    }

    const systemPrompt = `
      Role: Intelligent Data Compliance & Simulation Engine.
      Objective: Populate a tabular structure with realistic, context-aware, and compliant data based on specific constraints.
      
      Context: ${template.context}
      
      Reference - Common Validation Rules Library (Apply these if column semantics match):
      ${JSON.stringify(COMMON_VALIDATION_RULES, null, 2)}

      Reference - Anomaly & Correction Scenarios (Use these for generating 'Corrective Action' or 'Notes' when simulation implies a failure):
      ${JSON.stringify(ANOMALY_SCENARIOS, null, 2)}
      
      Rules & Constraints:
      - Target Timeframe: The data must be generated specifically for ${targetDateStr} (YYYY-MM).
        - Ensure day numbers correspond to dates starting from index ${startDay} of the month.
        - Handle leap years correctly if February is selected.
        - If columns refer to "Weekdays" or "Weekends", match the actual calendar for ${targetDateStr}.
      - ${template.aiRules}
      - Simulation Mode: ${config.mode.toUpperCase()}
      - Fill Rate: ${config.fillRate}% of cells should be non-empty (unless logic dictates empty).
      - Anomaly Chance: ${config.anomalyChance}% of rows should have a potential compliance issue (e.g., pH too high, Chlorine too low).
      - If an anomaly occurs (Value out of range), the 'corrective_action' or 'observation' column MUST have a relevant technical comment explaining the fix (e.g., "Dosed acid", "Backwashed").
      - Use industry-specific terminology.
      - Do NOT use generic placeholders like "Item 1".
      
      Specific Logic:
      - If Mode is 'compliant', all numbers must be strictly within bounds defined in column labels.
      - If Mode is 'realistic', allow minor fluctuations, with occasional corrections.
      - If Mode is 'chaos', generate frequent failures.
      
      Task:
      Generate ${currentBatchSize} rows of data corresponding to the schema provided.
      This is batch ${i + 1} of ${batches}. Start generating from row/day ${startDay}.
      Return ONLY the JSON array.
    `;

    try {
      const response = await retryWithBackoff<GenerateContentResponse>(() => client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate batch ${i+1} of data for table: ${template.name}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: config.mode === 'chaos' ? 0.9 : 0.4,
        }
      }));

      const text = response.text;
      if (text) {
          const batchData = JSON.parse(text) as RowData[];
          allRows = [...allRows, ...batchData];
      }
    } catch (error) {
      console.error(`Error generating batch ${i + 1}:`, error);
      throw error;
    }
  }

  return allRows;
};

export const fixDataRows = async (
  rows: RowData[],
  template: TableTemplate
): Promise<RowData[]> => {
  const client = getClient();

  const properties: Record<string, Schema> = {};
  const requiredFields: string[] = [];

  template.columns.forEach(col => {
    properties[col.key] = {
      type: col.type === 'number' ? Type.NUMBER : Type.STRING,
      nullable: true,
      description: `Column: ${col.label} ${col.subLabel ? `(${col.subLabel})` : ''}. Group: ${col.group || 'None'}`
    };
    requiredFields.push(col.key);
  });

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: properties,
      required: requiredFields, 
    }
  };

  const systemPrompt = `
    Role: Intelligent Data Compliance Officer.
    Objective: Review the provided data rows and FIX any anomalies, errors, or missing values to ensure strict compliance.
    
    Context: ${template.context}
    Columns Definitions: ${JSON.stringify(template.columns.map(c => `${c.label} (${c.subLabel || ''})`))}

    Rules:
    1. Identify values that are out of compliance (e.g., pH outside 7.2-7.8, Chlorine outside 1.0-3.0).
    2. CORRECT these values to be within the safe/compliant range.
    3. If 'corrective_action' or similar column exists, update it to say "Auto-corrected by system" or clear it if the issue is resolved.
    4. Fill any missing values that should be present.
    5. Return the corrected rows in the exact same JSON structure.
  `;

  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify(rows),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for deterministic corrections
      }
    }));

    const text = response.text;
    if (text) {
        return JSON.parse(text) as RowData[];
    }
    return rows; // Return original if parsing fails
  } catch (error) {
    console.error("Error fixing rows:", error);
    throw error;
  }
};

export const analyzeFileAndGenerate = async (
  fileBase64: string,
  mimeType: string,
  config: SimulationConfig
): Promise<{ template: Partial<TableTemplate>, rows: RowData[] }> => {
   const client = getClient();
   const targetDateStr = config.targetMonth || new Date().toISOString().slice(0, 7);

   const systemPrompt = `
    You are an expert OCR and Data Simulation agent.
    1. Analyze the file provided (image or PDF).
    2. Extract the column headers and infer the data types and validation rules (min/max).
    3. Generate realistic data to fill this table based on the extracted structure.
    4. Adhere to the following simulation settings: Mode=${config.mode}, AnomalyChance=${config.anomalyChance}%.
    5. Target Timeframe: Generate data for ${targetDateStr} (YYYY-MM). Align dates/weekdays to this period.

    Reference - Common Validation Rules Library (Apply if relevant to extracted columns):
    ${JSON.stringify(COMMON_VALIDATION_RULES, null, 2)}

    Reference - Anomaly & Correction Scenarios (Use these if applicable to inferred context):
    ${JSON.stringify(ANOMALY_SCENARIOS, null, 2)}
    
    Output Format:
    Return a single valid JSON object with exactly these two keys:
    - "template": { 
        "name": string, 
        "description": string,
        "context": string,
        "columns": Array<{ "key": string, "label": string, "type": "text"|"number"|"date"|"select", "subLabel"?: string }> 
      }
    - "rows": Array of objects, where keys match the 'key' fields defined in template.columns.
   `;
   
   try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
           inlineData: {
              mimeType: mimeType,
              data: fileBase64
           }
        },
        { text: "Analyze this table and generate compliant data." }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      }
    }));

    const text = response.text;
    if(!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

   } catch (error) {
    console.error("File Analysis Error:", JSON.stringify(error, null, 2));
    throw error;
   }
};