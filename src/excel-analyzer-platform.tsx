import React, { useState, useCallback, useRef } from 'react';
import { Upload, MessageCircle, BarChart3, FileSpreadsheet, Brain, Loader2, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const ExcelAnalyzerPlatform = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [dataPreview, setDataPreview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  // Data cleaning and processing utilities
  const cleanColumnName = (name) => {
    if (!name || name.toString().trim() === '') {
      return `Column_${Math.random().toString(36).substr(2, 9)}`;
    }
    return name.toString()
      .trim()
      .replace(/[^\w\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  };

  const detectDataTypes = (data) => {
    const types = {};
    const sample = data.slice(0, 100); // Sample first 100 rows
    
    Object.keys(sample[0] || {}).forEach(col => {
      const values = sample.map(row => row[col]).filter(val => val !== null && val !== undefined && val !== '');
      
      if (values.length === 0) {
        types[col] = 'text';
        return;
      }

      const numericCount = values.filter(val => !isNaN(parseFloat(val))).length;
      const dateCount = values.filter(val => !isNaN(Date.parse(val))).length;
      
      if (numericCount / values.length > 0.8) {
        types[col] = 'number';
      } else if (dateCount / values.length > 0.8) {
        types[col] = 'date';
      } else {
        types[col] = 'text';
      }
    });
    
    return types;
  };

  const cleanData = (rawData, headers) => {
    return rawData.map((row, index) => {
      const cleanRow = {};
      headers.forEach((header, colIndex) => {
        const value = row[header] || row[colIndex] || '';
        
        // Handle different data types
        if (value === null || value === undefined || value === '') {
          cleanRow[header] = null;
        } else if (typeof value === 'number') {
          cleanRow[header] = value;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          // Try to parse as number
          const numValue = parseFloat(trimmed);
          if (!isNaN(numValue) && trimmed.match(/^-?\d*\.?\d+$/)) {
            cleanRow[header] = numValue;
          } else {
            cleanRow[header] = trimmed;
          }
        } else {
          cleanRow[header] = value.toString().trim();
        }
      });
      return cleanRow;
    }).filter(row => Object.values(row).some(val => val !== null && val !== ''));
  };

  const processExcelFile = useCallback(async (file) => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const allSheets = {};
      const processedSheets = {};
      
      // Process each sheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (rawData.length === 0) return;
        
        // Find the actual header row (first non-empty row)
        let headerRowIndex = 0;
        while (headerRowIndex < rawData.length && rawData[headerRowIndex].every(cell => !cell)) {
          headerRowIndex++;
        }
        
        if (headerRowIndex >= rawData.length) return;
        
        // Extract and clean headers
        let headers = rawData[headerRowIndex].map((header, index) => 
          cleanColumnName(header || `Column_${index + 1}`)
        );
        
        // Remove empty trailing columns
        const lastDataIndex = Math.max(...rawData.slice(headerRowIndex + 1)
          .map(row => row.findLastIndex(cell => cell !== '')));
        headers = headers.slice(0, lastDataIndex + 1);
        
        // Process data rows
        const dataRows = rawData.slice(headerRowIndex + 1)
          .filter(row => row.some(cell => cell !== ''))
          .map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        
        if (dataRows.length > 0) {
          const cleanedData = cleanData(dataRows, headers);
          const dataTypes = detectDataTypes(cleanedData);
          
          allSheets[sheetName] = rawData;
          processedSheets[sheetName] = {
            data: cleanedData,
            headers: headers,
            types: dataTypes,
            rowCount: cleanedData.length,
            summary: generateDataSummary(cleanedData, headers, dataTypes)
          };
        }
      });
      
      if (Object.keys(processedSheets).length === 0) {
        throw new Error('No valid data found in the Excel file');
      }
      
      setFileData({ raw: allSheets, processed: processedSheets });
      
      // Set preview to the first sheet with data
      const firstSheetName = Object.keys(processedSheets)[0];
      setDataPreview({
        sheetName: firstSheetName,
        data: processedSheets[firstSheetName].data.slice(0, 10),
        headers: processedSheets[firstSheetName].headers,
        totalRows: processedSheets[firstSheetName].rowCount
      });
      
      // Add welcome message
      setMessages([{
        type: 'system',
        content: `📊 File "${file.name}" processed successfully! Found ${Object.keys(processedSheets).length} sheet(s) with data. You can now ask questions about your data in natural language.`,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setMessages([{
        type: 'error',
        content: `❌ Error processing file: ${error.message}. Please ensure it's a valid Excel file with data.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generateDataSummary = (data, headers, types) => {
    const summary = {
      rowCount: data.length,
      columnCount: headers.length,
      columns: {},
      numericColumns: [],
      textColumns: [],
      dateColumns: []
    };
    
    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== '');
      const type = types[header];
      
      summary.columns[header] = {
        type,
        nonNullCount: values.length,
        nullCount: data.length - values.length
      };
      
      if (type === 'number') {
        summary.numericColumns.push(header);
        const numbers = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (numbers.length > 0) {
          summary.columns[header].min = Math.min(...numbers);
          summary.columns[header].max = Math.max(...numbers);
          summary.columns[header].avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        }
      } else if (type === 'text') {
        summary.textColumns.push(header);
        summary.columns[header].uniqueValues = new Set(values).size;
      } else if (type === 'date') {
        summary.dateColumns.push(header);
      }
    });
    
    return summary;
  };

  // AI Query Processing Engine
  const processQuery = async (query) => {
    if (!fileData) return null;
    
    const sheets = fileData.processed;
    const sheetNames = Object.keys(sheets);
    
    // Simple NLP processing for business questions
    const lowerQuery = query.toLowerCase();
    
    // Detect query type and intent
    const queryPatterns = {
      summary: /(?:summary|overview|describe|what.*data|tell me about)/,
      trend: /(?:trend|over time|change|growth|decline)/,
      comparison: /(?:compare|versus|vs|difference|which.*better)/,
      aggregation: /(?:total|sum|count|average|max|min|highest|lowest)/,
      filter: /(?:where|when|filter|show.*only|exclude)/,
      topbottom: /(?:top|bottom|best|worst|\d+.*highest|\d+.*lowest)/
    };
    
    let queryType = 'general';
    for (const [type, pattern] of Object.entries(queryPatterns)) {
      if (pattern.test(lowerQuery)) {
        queryType = type;
        break;
      }
    }
    
    // Find relevant columns and sheets
    let relevantSheet = sheetNames[0]; // Default to first sheet
    let relevantColumns = [];
    
    // Look for column mentions in query
    for (const sheetName of sheetNames) {
      const sheet = sheets[sheetName];
      for (const header of sheet.headers) {
        if (lowerQuery.includes(header.toLowerCase()) || 
            lowerQuery.includes(header.replace(/_/g, ' ').toLowerCase())) {
          relevantSheet = sheetName;
          relevantColumns.push(header);
        }
      }
    }
    
    const sheet = sheets[relevantSheet];
    if (!sheet) return null;
    
    // Generate response based on query type
    return generateQueryResponse(queryType, query, sheet, relevantColumns);
  };

  const generateQueryResponse = (queryType, originalQuery, sheet, relevantColumns) => {
    const { data, headers, summary, types } = sheet;
    
    switch (queryType) {
      case 'summary':
        return {
          type: 'summary',
          text: `Here's a summary of your data:\n\n• **${summary.rowCount}** total rows\n• **${summary.columnCount}** columns\n• **${summary.numericColumns.length}** numeric columns: ${summary.numericColumns.join(', ')}\n• **${summary.textColumns.length}** text columns: ${summary.textColumns.join(', ')}`,
          chart: null,
          table: data.slice(0, 5)
        };
        
      case 'aggregation':
        const numericCols = summary.numericColumns;
        if (numericCols.length > 0) {
          const aggregations = {};
          numericCols.forEach(col => {
            const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
            aggregations[col] = {
              total: values.reduce((a, b) => a + b, 0),
              average: values.reduce((a, b) => a + b, 0) / values.length,
              count: values.length,
              max: Math.max(...values),
              min: Math.min(...values)
            };
          });
          
          const chartData = numericCols.map(col => ({
            name: col,
            total: aggregations[col].total,
            average: Math.round(aggregations[col].average * 100) / 100
          }));
          
          return {
            type: 'aggregation',
            text: `Here are the key statistics for your numeric data:`,
            chart: { type: 'bar', data: chartData, xKey: 'name', yKey: 'total' },
            table: Object.entries(aggregations).map(([col, stats]) => ({
              Column: col,
              Total: stats.total.toLocaleString(),
              Average: Math.round(stats.average * 100) / 100,
              Count: stats.count,
              Max: stats.max,
              Min: stats.min
            }))
          };
        }
        break;
        
      case 'topbottom':
        if (summary.numericColumns.length > 0) {
          const numCol = summary.numericColumns[0];
          const sorted = [...data].sort((a, b) => parseFloat(b[numCol]) - parseFloat(a[numCol]));
          const top10 = sorted.slice(0, 10);
          
          const chartData = top10.map((row, index) => ({
            name: row[headers[0]] || `Row ${index + 1}`,
            value: parseFloat(row[numCol]) || 0
          }));
          
          return {
            type: 'ranking',
            text: `Here are the top entries by ${numCol}:`,
            chart: { type: 'bar', data: chartData, xKey: 'name', yKey: 'value' },
            table: top10
          };
        }
        break;
        
      case 'trend':
        const dateCol = summary.dateColumns[0];
        const numCol = summary.numericColumns[0];
        
        if (dateCol && numCol) {
          const trendData = data
            .filter(row => row[dateCol] && row[numCol])
            .map(row => ({
              date: new Date(row[dateCol]).toISOString().split('T')[0],
              value: parseFloat(row[numCol]) || 0
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
            
          return {
            type: 'trend',
            text: `Showing trend of ${numCol} over ${dateCol}:`,
            chart: { type: 'line', data: trendData, xKey: 'date', yKey: 'value' },
            table: trendData.slice(0, 10)
          };
        }
        break;
    }
    
    // Default response - show relevant data
    const filteredData = relevantColumns.length > 0 
      ? data.map(row => {
          const filtered = {};
          relevantColumns.forEach(col => filtered[col] = row[col]);
          return filtered;
        })
      : data.slice(0, 10);
    
    return {
      type: 'data',
      text: `Here's the data${relevantColumns.length > 0 ? ` for columns: ${relevantColumns.join(', ')}` : ''}:`,
      chart: null,
      table: filteredData
    };
  };

  const renderChart = (chartConfig) => {
    if (!chartConfig) return null;
    
    const { type, data, xKey, yKey } = chartConfig;
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];
    
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey={yKey}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      processExcelFile(file);
    }
  }, [processExcelFile]);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!currentQuery.trim() || !fileData) return;
    
    setIsAnalyzing(true);
    
    // Add user message
    const userMessage = {
      type: 'user',
      content: currentQuery,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await processQuery(currentQuery);
      
      const aiMessage = {
        type: 'ai',
        content: response?.text || 'I understand your question, but I need more specific information to provide a helpful answer. Could you try asking about specific columns or data aspects?',
        chart: response?.chart,
        table: response?.table,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: 'Sorry, I encountered an error processing your question. Please try rephrasing it.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
      setCurrentQuery('');
    }
  };

  const renderTable = (tableData) => {
    if (!tableData || tableData.length === 0) return null;
    
    const headers = Object.keys(tableData[0]);
    const maxRows = 10;
    
    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(0, maxRows).map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map(header => (
                  <td key={header} className="px-4 py-2 text-sm text-gray-900 border-b">
                    {row[header] !== null && row[header] !== undefined 
                      ? typeof row[header] === 'number' 
                        ? row[header].toLocaleString() 
                        : row[header].toString()
                      : '-'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length > maxRows && (
          <p className="text-sm text-gray-500 mt-2">
            Showing {maxRows} of {tableData.length} rows
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Excel AI Analyzer</h1>
                <p className="text-gray-600">Upload Excel files and ask questions in natural language</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Brain className="w-5 h-5" />
              <span>AI-Powered Analysis</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - File Upload & Preview */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-600" />
                Upload Excel File
              </h2>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isProcessing 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-blue-600 font-medium">Processing Excel file...</p>
                  </div>
                ) : uploadedFile ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-green-600 mb-3" />
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">Click to upload a different file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="font-medium text-gray-900">Drop Excel file here</p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>✓ Supports .xlsx and .xls formats</p>
                <p>✓ Handles messy and incomplete data</p>
                <p>✓ Processes multiple sheets</p>
              </div>
            </div>

            {/* Data Preview */}
            {dataPreview && (
              <div className="bg-white rounded-xl shadow-lg p-6 border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                  Data Preview
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Sheet: <span className="font-medium">{dataPreview.sheetName}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {dataPreview.totalRows} rows, {dataPreview.headers.length} columns
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {dataPreview.headers.slice(0, 3).map(header => (
                          <th key={header} className="px-3 py-2 text-left font-medium text-gray-700 truncate">
                            {header}
                          </th>
                        ))}
                        {dataPreview.headers.length > 3 && (
                          <th className="px-3 py-2 text-gray-400">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {dataPreview.data.slice(0, 5).map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {dataPreview.headers.slice(0, 3).map(header => (
                            <td key={header} className="px-3 py-2 text-gray-900 truncate max-w-20">
                              {row[header] !== null ? row[header].toString() : '-'}
                            </td>
                          ))}
                          {dataPreview.headers.length > 3 && (
                            <td className="px-3 py-2 text-gray-400">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <MessageCircle className="w-6 h-6 mr-2" />
                  Ask Questions About Your Data
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Try: "Show me a summary", "What are the trends?", "Which has the highest values?"
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Upload an Excel file to start asking questions</p>
                    <div className="mt-6 space-y-2 text-sm text-gray-400">
                      <p>📊 "Give me a summary of the data"</p>
                      <p>📈 "Show me trends over time"</p>
                      <p>🔝 "What are the top 10 values?"</p>
                      <p>📋 "Compare different categories"</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-4xl ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : message.type === 'error'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-gray-50 text-gray-800 border'
                      } rounded-lg p-4 shadow-sm`}>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Render chart if present */}
                        {message.chart && (
                          <div className="mt-4 bg-white p-4 rounded-lg border">
                            {renderChart(message.chart)}
                          </div>
                        )}
                        
                        {/* Render table if present */}
                        {message.table && renderTable(message.table)}
                        
                        <div className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Loading indicator */}
                {isAnalyzing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-gray-600">Analyzing your question...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <div className="p-6 border-t bg-gray-50">
                <form onSubmit={handleQuerySubmit} className="flex space-x-4">
                  <input
                    type="text"
                    value={currentQuery}
                    onChange={(e) => setCurrentQuery(e.target.value)}
                    placeholder={
                      fileData 
                        ? "Ask me anything about your data..." 
                        : "Upload a file first to ask questions"
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!fileData || isAnalyzing}
                  />
                  <button
                    type="submit"
                    disabled={!fileData || !currentQuery.trim() || isAnalyzing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Ask'}</span>
                  </button>
                </form>
                
                {!fileData && (
                  <div className="mt-3 flex items-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Please upload an Excel file first to start asking questions about your data.
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Action Buttons */}
            {fileData && (
              <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border">
                <h3 className="text-lg font-semibold mb-4">Quick Questions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    "Give me a summary",
                    "Show me trends",
                    "What are the totals?",
                    "Top 10 values",
                    "Compare categories",
                    "Find outliers",
                    "Missing data?",
                    "Export results"
                  ].map((question) => (
                    <button
                      key={question}
                      onClick={() => {
                        setCurrentQuery(question);
                        // Auto-submit for better UX
                        setTimeout(() => {
                          const event = new Event('submit');
                          handleQuerySubmit({ preventDefault: () => {}, ...event });
                        }, 100);
                      }}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                      disabled={isAnalyzing}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Advanced Features Section */}
        {fileData && (
          <div className="mt-12 bg-white rounded-xl shadow-lg p-8 border">
            <h2 className="text-2xl font-bold mb-6 text-center">Platform Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Smart Data Processing</h3>
                <p className="text-gray-600 text-sm">
                  Automatically handles messy data, unnamed columns, and inconsistent formatting
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Natural Language AI</h3>
                <p className="text-gray-600 text-sm">
                  Ask complex business questions in plain English and get intelligent insights
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Interactive Visualizations</h3>
                <p className="text-gray-600 text-sm">
                  Automatic chart generation with tables and visual insights for your data
                </p>
              </div>
            </div>
            
            {/* Data Quality Indicators */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Data Quality Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(fileData.processed).map(sheetName => {
                  const sheet = fileData.processed[sheetName];
                  const completeness = ((sheet.rowCount * sheet.headers.length) - 
                    Object.values(sheet.summary.columns).reduce((sum, col) => sum + col.nullCount, 0)) / 
                    (sheet.rowCount * sheet.headers.length) * 100;
                    
                  return (
                    <div key={sheetName} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 truncate">{sheetName}</h4>
                      <div className="space-y-2 text-xs text-gray-600">
                        <div>Rows: {sheet.rowCount.toLocaleString()}</div>
                        <div>Columns: {sheet.headers.length}</div>
                        <div>Completeness: {Math.round(completeness)}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${completeness}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Excel AI Analyzer - Transform your spreadsheets into interactive insights</p>
          <p className="mt-2">
            Supports complex data structures • Natural language queries • Real-time analysis
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExcelAnalyzerPlatform; 