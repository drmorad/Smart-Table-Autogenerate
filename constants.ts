import { TableTemplate, MaintenanceDocument } from './types';

export const COMMON_VALIDATION_RULES = {
  text: {
    unique: { description: "Ensure all values in this column are distinct (no duplicates).", example: "ID-101, ID-102" },
    email: { description: "Format must be a valid email address.", example: "user@example.com" },
    phone: { description: "Format must be a standard telephone number.", example: "+1-555-0102" },
    alphanumeric: { description: "Contains only letters and numbers, no special symbols.", example: "A1B2C3" },
    required_field: { description: "Value must not be empty.", example: "N/A" }
  },
  number: {
    range_0_100: { description: "Value must be between 0 and 100 (inclusive).", example: "45, 99.5" },
    positive: { description: "Value must be strictly greater than 0.", example: "1, 500" },
    integer: { description: "Value must be a whole number.", example: "10, 42" },
    currency: { description: "Format as currency with 2 decimal places.", example: "19.99" }
  },
  date: {
    past: { description: "Date must be before today.", example: "2023-01-01" },
    future: { description: "Date must be after today.", example: "2025-12-31" },
    business_day: { description: "Date must be a weekday (Mon-Fri).", example: "2023-11-13 (Monday)" }
  }
};

export const ANOMALY_SCENARIOS = {
  water_quality: {
    high_ph: { condition: "pH > 7.8", outcome: "Scale formation risk", corrective_action: "Added pH decreaser (Acid)." },
    low_ph: { condition: "pH < 7.2", outcome: "Corrosive water", corrective_action: "Added pH increaser (Soda Ash)." },
    low_chlorine: { condition: "Chlorine < 1.0 ppm", outcome: "Bacteria growth risk", corrective_action: "Manual shock dosage applied." },
    high_chlorine: { condition: "Chlorine > 3.0 ppm", outcome: "Skin irritation risk", corrective_action: "Stopped dosing, added fresh water." },
    high_combined_chlorine: { condition: "Combined Chlorine > 1.0 ppm", outcome: "Chloramines present", corrective_action: "Performed breakpoint chlorination." }
  },
  equipment_maintenance: {
    high_pressure: { condition: "Pressure Differential > 10 PSI", outcome: "Filter clogged", corrective_action: "Performed backwash cycle." },
    leak_detected: { condition: "Water visible on floor", outcome: "Seal failure", corrective_action: "Tightened connections / Replaced seal." },
    pump_failure: { condition: "No flow detected", outcome: "Pump not starting", corrective_action: "Reset breaker, checked intake." }
  },
  general_logging: {
    missing_entry: { condition: "Cell is empty", outcome: "Missed check", corrective_action: "Notified supervisor, scheduled makeup check." },
    illegible: { condition: "Value unclear", outcome: "Data entry error", corrective_action: "Clarified with operator." }
  },
  ornamental_fountains: {
    high_algae_bloom: { condition: "Turbidity > 50 NTU", outcome: "Reduced water clarity", corrective_action: "Added algaecide, increased filtration." }
  }
};

export const TEMPLATES: TableTemplate[] = [
  {
    id: 'P-01-R1-Pool',
    name: 'P-01-R1: Pool Chemical Parameters',
    description: 'Daily tracking of Free Cl, Combined Cl, and pH (3x daily), plus Turbidity and Cyanuric Acid.',
    context: 'Swimming Pool Chemical Control. Monitoring Free Chlorine (1-3 ppm), Combined Chlorine (max 1 ppm), and pH (7.2-7.8) at 9AM, 11AM, and 3PM.',
    defaultRows: 31,
    aiRules: 'Generate 31 rows representing days 1-31. Fill 9AM, 11AM, 3PM columns for Free Cl, Combined Cl, and pH. Keep values mostly compliant. Occasional deviations in pH or Cl should have a note in "Corrective action". Turbidity usually "N". Cyanuric Acid < 80.',
    columns: [
        { key: 'day', label: 'Day', type: 'number', width: '50px' },
        // Free Chlorine
        { key: 'fcl_9am', label: '9:00 AM', subLabel: 'Free Cl (1-3)', group: 'Free Chlorine', type: 'number' },
        { key: 'fcl_11am', label: '11:00 AM', subLabel: 'Free Cl (1-3)', group: 'Free Chlorine', type: 'number' },
        { key: 'fcl_3pm', label: '3:00 PM', subLabel: 'Free Cl (1-3)', group: 'Free Chlorine', type: 'number' },
        // Combined Chlorine
        { key: 'ccl_9am', label: '9:00 AM', subLabel: 'Comb Cl (max 1)', group: 'Combined Chlorine', type: 'number' },
        { key: 'ccl_11am', label: '11:00 AM', subLabel: 'Comb Cl (max 1)', group: 'Combined Chlorine', type: 'number' },
        { key: 'ccl_3pm', label: '3:00 PM', subLabel: 'Comb Cl (max 1)', group: 'Combined Chlorine', type: 'number' },
        // pH
        { key: 'ph_9am', label: '9:00 AM', subLabel: 'pH (7.2-7.8)', group: 'pH', type: 'number' },
        { key: 'ph_11am', label: '11:00 AM', subLabel: 'pH (7.2-7.8)', group: 'pH', type: 'number' },
        { key: 'ph_3pm', label: '3:00 PM', subLabel: 'pH (7.2-7.8)', group: 'pH', type: 'number' },
        // Others
        { key: 'turbidity', label: 'Turbidity', subLabel: 'Y/N', type: 'text' },
        { key: 'cyanuric', label: 'Cyanuric Acid', subLabel: '< 80ppm', type: 'number' },
        { key: 'add_fresh_water', label: 'Add 5% Fresh Water', type: 'text' },
        { key: 'corrective_action', label: 'Corrective Action', type: 'text', width: '200px' },
        { key: 'name', label: 'Name', type: 'text' }
    ]
  },
  {
    id: 'P-01-R2',
    name: 'P-01-R2: Monthly & Annual Tasks',
    description: 'Annual equipment revision and sand media replacement tracking.',
    context: 'Pool Maintenance - Monthly and Annual Tasks. General revision of equipment and sand media replacement.',
    defaultRows: 10,
    aiRules: 'Generate rows for different pools (e.g., Main Pool, Kids Pool, Spa, Lap Pool). Dates should be distributed throughout the year for annual tasks. "By whom" should be a name or "EC".',
    columns: [
        { key: 'pool_name', label: 'Pool Name / Location', type: 'text', width: '250px' },
        { key: 'general_revision', label: 'General Revision', subLabel: 'Annually', type: 'date' },
        { key: 'sand_media', label: 'Sand Media Revision', subLabel: 'Annually', type: 'date' },
        { key: 'by_whom', label: 'By Whom', subLabel: 'EC', type: 'text' }
    ]
  },
  {
    id: 'P-01-R3',
    name: 'P-01-R3: Pool Cleaning Schedule',
    description: 'Weekly cleaning log supervised by internal recreation staff.',
    context: 'Pool Cleaning Log. 4 Weeks. Daily checks (Mon-Sun).',
    defaultRows: 4,
    aiRules: 'Generate exactly 4 rows: "Week 1", "Week 2", "Week 3", "Week 4". Columns Mon-Sun should have checkmarks ("✓") or initials indicating cleaning was done. Notes should occasionally mention "Deep cleaning" or "Chlorine shock".',
    columns: [
        { key: 'week', label: 'Week', type: 'text', width: '100px' },
        { key: 'mon', label: 'Monday', type: 'text' },
        { key: 'tue', label: 'Tuesday', type: 'text' },
        { key: 'wed', label: 'Wednesday', type: 'text' },
        { key: 'thu', label: 'Thursday', type: 'text' },
        { key: 'fri', label: 'Friday', type: 'text' },
        { key: 'sat', label: 'Saturday', type: 'text' },
        { key: 'sun', label: 'Sunday', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'text', width: '300px' }
    ]
  },
  {
    id: 'P-03-R1',
    name: 'P-03-R1: Spa Chemical Parameters',
    description: 'Daily tracking for Spa: Chlorine, pH, Turbidity (3x daily).',
    context: 'Spa Chemical Control. Higher temperature environment. Monitoring Free Chlorine (1-3 ppm), Combined Chlorine (max 1 ppm), and pH (7.2-7.8) three times a day.',
    defaultRows: 31,
    aiRules: 'Generate 31 rows for a month. Spa maintenance. Fill 9AM, 11AM, 3PM columns. Note: High bather load often affects Combined Chlorine in Spas.',
    columns: [
         { key: 'day', label: 'Day', type: 'number', width: '50px' },
        // Free Chlorine
        { key: 'fcl_9am', label: '9:00 AM', subLabel: 'Free Cl (1-3)', group: 'Free Chlorine', type: 'number' },
        { key: 'fcl_11am', label: '11:00 AM', subLabel: 'Free Cl (1-3)', group: 'Free Chlorine', type: 'number' },
        { key: 'fcl_3pm', label: '3:00 PM', subLabel: 'Free Cl (1-3)', group: 'Free Chlorine', type: 'number' },
        // Combined Chlorine
        { key: 'ccl_9am', label: '9:00 AM', subLabel: 'Comb Cl (max 1)', group: 'Combined Chlorine', type: 'number' },
        { key: 'ccl_11am', label: '11:00 AM', subLabel: 'Comb Cl (max 1)', group: 'Combined Chlorine', type: 'number' },
        { key: 'ccl_3pm', label: '3:00 PM', subLabel: 'Comb Cl (max 1)', group: 'Combined Chlorine', type: 'number' },
        // pH
        { key: 'ph_9am', label: '9:00 AM', subLabel: 'pH (7.2-7.8)', group: 'pH', type: 'number' },
        { key: 'ph_11am', label: '11:00 AM', subLabel: 'pH (7.2-7.8)', group: 'pH', type: 'number' },
        { key: 'ph_3pm', label: '3:00 PM', subLabel: 'pH (7.2-7.8)', group: 'pH', type: 'number' },
        // Others
        { key: 'turbidity', label: 'Turbidity', subLabel: 'Y/N', type: 'text' },
        { key: 'cyanuric', label: 'Cyanuric Acid', subLabel: '< 80ppm', type: 'number' },
        { key: 'name', label: 'Name', type: 'text' }
    ]
  },
  {
    id: 'W-04-R2',
    name: 'Daily Chlorine & pH (Sprinklers)',
    description: 'Monitor daily chlorine and pH levels at different times.',
    context: 'Potable Water and Legionella Control - Daily Chlorine & pH in sprinklers of Irrigation water.',
    defaultRows: 31,
    aiRules: 'Generate data for a full month (rows 1-31). Columns include readings for 9:00 AM, 11:00 AM, 3:00 PM, and 8:00 PM. Constraints: CL > 1.0 ppm, pH 7.2-7.8. If values are out of range, provide a "Corrective action".',
    columns: [
      { key: 'record_id', label: 'ID', type: 'text', width: '60px' },
      { key: 'date', label: 'Date', type: 'number', width: '60px' },
      { key: 'cl_9am', label: 'CL', subLabel: '>1.0 ppm', group: '9:00 AM Check', type: 'number' },
      { key: 'ph_9am', label: 'pH', subLabel: '7.2-7.8', group: '9:00 AM Check', type: 'number' },
      { key: 'cl_11am', label: 'CL', subLabel: '>1.0 ppm', group: '11:00 AM Check', type: 'number' },
      { key: 'ph_11am', label: 'pH', subLabel: '7.2-7.8', group: '11:00 AM Check', type: 'number' },
      { key: 'cl_3pm', label: 'CL', subLabel: '>1.0 ppm', group: '3:00 PM Check', type: 'number' },
      { key: 'ph_3pm', label: 'pH', subLabel: '7.2-7.8', group: '3:00 PM Check', type: 'number' },
      { key: 'cl_8pm', label: 'CL', subLabel: '>0.5 ppm', group: '8:00 PM End Check', type: 'number' },
      { key: 'ph_8pm', label: 'pH', subLabel: '7.2-7.8', group: '8:00 PM End Check', type: 'number' },
      { key: 'corrective_action', label: 'Corrective Action / Comment', type: 'text', width: '250px' },
      { key: 'checked_by', label: 'Checked By', type: 'text' },
    ]
  },
  {
    id: 'P-01-R1-Old',
    name: 'Ornamental Fountains (Simple)',
    description: 'Chemical parameters tracking for ornamental fountains (2x Daily).',
    context: 'Ornamental Fountains Chemical parameters. Tracking Free Chlorine and pH twice daily.',
    defaultRows: 31,
    aiRules: 'Generate daily logs (rows 1-31). Two checks per day (10:00 AM and 5:00 PM). Rules: Free Chlorine 1-3 ppm, pH 7.2-7.8. "Add 5% fresh water" column should be yes/no or amount. If parameters deviate, note in Observation.',
    columns: [
      { key: 'date', label: 'Date', type: 'number', width: '60px' },
      { key: 'cl_10am', label: 'Free Chlorine', subLabel: '1-3 ppm', group: '10:00 AM', type: 'number' },
      { key: 'ph_10am', label: 'pH', subLabel: '7.2-7.8', group: '10:00 AM', type: 'number' },
      { key: 'cl_5pm', label: 'Free Chlorine', subLabel: '1-3 ppm', group: '5:00 PM', type: 'number' },
      { key: 'ph_5pm', label: 'pH', subLabel: '7.2-7.8', group: '5:00 PM', type: 'number' },
      { key: 'add_water', label: 'Add 5% Fresh Water', type: 'text' },
      { key: 'observation', label: 'Observation / Corrective Action', type: 'text', width: '250px' },
      { key: 'done_by', label: 'Done By', type: 'text' },
    ]
  },
  {
    id: 'W-00-R4.1',
    name: 'Sand Filters Backwashing',
    description: 'Maintenance log for backwashing sand filters.',
    context: 'Domestic Water and Legionella Control - Backwashing (Sand Filters). Irrigation tank.',
    defaultRows: 31,
    aiRules: 'Daily log (1-31). Identify which filter was backwashed. If no backwash, leave empty or note status. Include observations if pressure differential was high.',
    columns: [
      { key: 'date', label: 'Date', type: 'number', width: '60px' },
      { key: 'filter_id', label: 'Filter', type: 'text' },
      { key: 'observation', label: 'Corrective Action / Observation', type: 'text', width: '300px' },
      { key: 'checked_by', label: 'Checked By', type: 'text' },
    ]
  },
  {
    id: 'W-04-R3',
    name: 'Shock Chlorination',
    description: 'Cleaning and Shock Chlorination of Irrigation tank.',
    context: 'Cleaning and Shock Chlorination of Irrigation tank and network. Hyper chlorination every 1-3 months.',
    defaultRows: 10,
    aiRules: 'This is not daily. Generate distinct dates over a year. Shock levels: 25ppm for 24hrs OR 50ppm for 4hrs. Final reading closest point should be ~0.5ppm. Fill realistic tank numbers.',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'tank_loc', label: 'Tank Number / Location', type: 'text' },
      { key: 'cl_tank', label: 'Chlorine Level in Tank', subLabel: 'After adding', type: 'text' },
      { key: 'cl_furthest', label: 'Chlorine @ Furthest', subLabel: '25ppm/24hr or 50ppm/4hr', type: 'text' },
      { key: 'cl_closest', label: 'Chlorine @ Closest', subLabel: 'Term. (~0.5ppm)', type: 'text' },
      { key: 'done_by', label: 'Done By', type: 'text' },
    ]
  },
  {
    id: 'W-04-R1',
    name: 'Quarterly Sprinkler Cleaning',
    description: 'Descaling & Disinfection log.',
    context: 'Quarterly Descaling & Disinfection of Irrigation Sprinkler Heads.',
    defaultRows: 5,
    aiRules: 'List groups of sprinklers cleaned. Example: "All of them", "Zone A", "North Garden". Date should be formatted Day/Month. Signatures should be names.',
    columns: [
      { key: 'date', label: 'Date', type: 'text', width: '100px' },
      { key: 'description', label: 'Sprinklers Cleaned / Disinfected', type: 'text', width: '500px' },
      { key: 'signatures', label: 'Signatures', type: 'text' },
    ]
  }
];

export const MOCK_NAMES = ["J. Smith", "A. Doe", "M. Garcia", "K. Lee", "R. Johnson", "B. Davis"];

export const INITIAL_DOCUMENTS: MaintenanceDocument[] = [
  {
    id: 'doc-001',
    title: 'Legionella Control Protocol (Decree 865/2003)',
    category: 'Hygiene',
    lastUpdated: '2023-11-15',
    nextReview: '2024-05-15',
    status: 'Compliant',
    authority: 'Health Ministry',
    content: '1. Maintain hot water > 50°C at return.\n2. Cold water < 20°C.\n3. Annual tank cleaning required.\n4. Quarterly shower head disinfection using chlorination method.'
  },
  {
    id: 'doc-002',
    title: 'Swimming Pool Hygiene Standards (P-01)',
    category: 'Hygiene',
    lastUpdated: '2023-12-01',
    nextReview: '2024-03-01',
    status: 'Review Needed',
    authority: 'Tourism Board',
    content: 'Daily parameter checks required: pH (7.2-7.8), CL (1.0-3.0). Turbidity must be checked 3x daily. In case of fecal accident, close pool for 24h and superchlorinate.'
  },
  {
    id: 'doc-003',
    title: 'Fire Safety Equipment Checks',
    category: 'Safety',
    lastUpdated: '2024-01-10',
    nextReview: '2024-02-10',
    status: 'Compliant',
    authority: 'Fire Dept',
    content: 'Monthly check of all extinguishers. Quarterly check of smoke detectors in common areas. Annual full system audit by external certified body.'
  },
  {
    id: 'doc-004',
    title: 'Boiler Room Access Policy',
    category: 'Structural',
    lastUpdated: '2022-05-20',
    nextReview: '2023-05-20',
    status: 'Review Needed',
    authority: 'Internal Policy',
    content: 'Authorized personnel only. PPE (Ear protection) mandatory. Door must remain locked. Log book entry required for all visitors.'
  },
  {
    id: 'doc-005',
    title: 'HVAC Filter Replacement Schedule',
    category: 'Equipment',
    lastUpdated: '2024-01-05',
    nextReview: '2024-04-05',
    status: 'Draft',
    authority: 'Internal Policy',
    content: 'Drafting new schedule for Summer 2024. Considering switch to HEPA filters for lobby area.'
  }
];
