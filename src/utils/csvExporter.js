/**
 * Client-Side CSV Exporter Utility (Zero Backend)
 * Exports tabular data to a CSV file in browser memory.
 * 
 * @param {string} filename - Desired output filename (e.g., 'Active_Members_List.csv')
 * @param {Array<string>} headers - Header column titles
 * @param {Array<Array<any>>} rows - 2D matrix of row values
 */
export const exportToCSV = (filename, headers, rows) => {
  const formatCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map(row => row.map(formatCell).join(',')).join('\n');
  const csvContent = `${headerLine}\n${rowLines}`;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
