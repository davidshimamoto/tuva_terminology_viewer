import { useState, useEffect } from 'react';
import { Search, Download, FileText, Loader2, SwitchVertical } from 'lucide-react';
import * as Papa from 'papaparse';
import pako from 'pako';

export default function CSVViewer() {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('https://tuva-public-resources.s3.amazonaws.com/versioned_terminology/0.14.9/admit_source.csv_0_0_0.csv.gz');
  const [terminologyFiles, setTerminologyFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPartialData, setIsPartialData] = useState(false);
  const [totalRowsEstimate, setTotalRowsEstimate] = useState(0);
  const [terminologyVersion, setTerminologyVersion] = useState('0.14.9');
  
  const baseDomain = 'https://tuva-public-resources.s3.amazonaws.com';
  const default_folder = 'versioned_terminology';
  const provider_folder = 'versioned_provider_data';

  // Determine the appropriate folder based on the file name
  const getBaseUrl = (filename) => {
    if (filename.includes('provider')) {
      return baseDomain + '/' + provider_folder + '/' + terminologyVersion + '/';
    } else {
      return baseDomain + '/' + default_folder + '/' + terminologyVersion + '/';
    }
  };

  // List of all terminology files
  const terminology_file_list = [
    'admit_source.csv_0_0_0.csv.gz',
    'admit_type.csv_0_0_0.csv.gz',
    'apr_drg.csv_0_0_0.csv.gz',
    'bill_type.csv_0_0_0.csv.gz',
    'ccs_services_procedures.csv_0_0_0.csv.gz',
    'claim_type.csv_0_0_0.csv.gz',
    'discharge_disposition.csv_0_0_0.csv.gz',
    'encounter_type.csv_0_0_0.csv.gz',
    'ethnicity.csv_0_0_0.csv.gz',
    'gender.csv_0_0_0.csv.gz',
    'hcpcs_level_2.csv_0_0_0.csv.gz',
    'hcpcs_to_rbcs.csv_0_0_0.csv.gz',
    'icd10_pcs_cms_ontology.csv_0_0_0.csv.gz',
    'icd_10_cm.csv_0_0_0.csv.gz',
    'icd_10_pcs.csv_0_0_0.csv.gz',
    'icd_9_cm.csv_0_0_0.csv.gz',
    'icd_9_pcs.csv_0_0_0.csv.gz',
    'loinc.csv_0_0_0.csv.gz',
    'loinc_deprecated_mapping.csv_0_0_0.csv.gz',
    'mdc.csv_0_0_0.csv.gz',
    'gender.csv_0_0_0.csv.gz',
    'medicare_dual_eligibility.csv_0_0_0.csv.gz',
    'medicare_orec.csv_0_0_0.csv.gz',
    'medicare_status.csv_0_0_0.csv.gz',
    'ms_drg.csv_0_0_0.csv.gz',
    'ms_drg_weights_los.csv_0_0_0.csv.gz',
    'ndc.csv_0_0_0.csv.gz',
    'nitos.csv_0_0_0.csv.gz',
    'other_provider_taxonomy.csv_0_0_0.csv.gz',
    'payer_type.csv_0_0_0.csv.gz',
    'place_of_service.csv_0_0_0.csv.gz',
    'present_on_admission.csv_0_0_0.csv.gz',
    'provider.csv_0_0_0.csv.gz',
    'race.csv_0_0_0.csv.gz',
    'revenue_center.csv_0_0_0.csv.gz',
    'rxnorm_brand_generic.csv_0_0_0.csv.gz',
    'rxnorm_to_atc.csv_0_0_0.csv.gz',
    'snomed_ct.csv_0_0_0.csv.gz',
    'snomed_ct_transitive_closures.csv_0_0_0.csv.gz',
    'snomed_icd_10_map.csv_0_0_0.csv.gz',
  ];

  // Initialize terminology files
  useEffect(() => {
    setTerminologyFiles(terminology_file_list);
  }, []);

  const fetchAndProcessCSV = async (url) => {
    setLoading(true);
    setError(null);
    try {
      // First try to fetch without range header to see if we can get headers
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText} (${currentUrl})`);
      }
      
      // Get the compressed data as ArrayBuffer
      const compressedData = await response.arrayBuffer();
      
      try {
        // Decompress the data using pako - use try/catch since partial gzip files might break
        const decompressed = pako.inflate(new Uint8Array(compressedData));
        
        // Convert Uint8Array to string
        const decoder = new TextDecoder('utf-8');
        const csvString = decoder.decode(decompressed);
        
        // Check if we got any data at all
        if (!csvString.trim()) {
          throw new Error("Decompressed file is empty");
        }
        
        // Parse the CSV data without headers
        Papa.parse(csvString, {
          header: false,
          dynamicTyping: false, // Disable dynamic typing to preserve string values
          skipEmptyLines: true,
          preview: 1000, // Limit to first 1000 rows
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setCsvData(results.data);
              setIsPartialData(compressedData.byteLength >= 500000);
              
              // Generate column placeholders based on the number of columns in the first row
              if (results.data[0] && Array.isArray(results.data[0])) {
                const columnCount = results.data[0].length;
                const placeholderHeaders = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
                setHeaders(placeholderHeaders);
              } else {
                setError('Unable to determine column structure');
              }
            } else {
              setError('No rows found in the CSV file');
            }
            setLoading(false);
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        // If decompression fails, try getting a smaller chunk of the file
        console.error("Full file decompression failed, trying with partial file", err);
        await fetchPartialCSV(url);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };
  
  // Function to fetch just a portion of a large file
  const fetchPartialCSV = async (url) => {
    try {
      // Fetch with range header to get just the start of the file
      const response = await fetch(url, {
        headers: {
          'Range': 'bytes=0-150000' // Get first 150KB which should be enough for headers and some rows
        }
      });
      
      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to fetch partial data: ${response.status} ${response.statusText}`);
      }
      
      // Get the compressed data as ArrayBuffer
      const compressedData = await response.arrayBuffer();
      
      try {
        // Try to decompress, but this might fail if we cut in the middle of the gzip stream
        const decompressed = pako.inflate(new Uint8Array(compressedData));
        const decoder = new TextDecoder('utf-8');
        const csvString = decoder.decode(decompressed);
        
        if (!csvString.trim()) {
          throw new Error("Decompressed partial file is empty");
        }
        
        // Parse the CSV data
        Papa.parse(csvString, {
          header: false,
          dynamicTyping: false, // Disable dynamic typing to preserve string values
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setCsvData(results.data);
              setIsPartialData(true); // We're definitely showing partial data
              
              // Generate column placeholders
              if (results.data[0] && Array.isArray(results.data[0])) {
                const columnCount = results.data[0].length;
                const placeholderHeaders = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
                setHeaders(placeholderHeaders);
              } else {
                setError('Unable to determine column structure from partial data');
              }
            } else {
              setError('No rows found in the partial CSV file');
            }
            setLoading(false);
          },
          error: (error) => {
            setError(`Error parsing partial CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        // If even partial decompression fails, we need another approach
        setError(`Unable to decompress this file format: ${err.message}`);
        setLoading(false);
      }
    } catch (err) {
      setError(`Error fetching partial data: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndProcessCSV(currentUrl);
    // Reset pagination when URL changes
    setCurrentPage(1);
  }, [currentUrl, terminologyVersion]);

  const handleFileSelect = (filename) => {
    // Use the appropriate base URL based on the filename
    const baseUrl = getBaseUrl(filename);
    setCurrentUrl(`${baseUrl}${filename}`);
  };

  const filteredFiles = terminologyFiles.filter(file => 
    file.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentFileName = () => {
    const parts = currentUrl.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100%',
      padding: '16px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 'calc(100% - 32px)',
        zIndex: 10
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          margin: 0
        }}>Tuva Terminology Viewer</h1>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <span style={{ marginRight: '8px', fontSize: '14px', fontWeight: 500 }}>Version:</span>
          <button 
            onClick={() => {
              setTerminologyVersion('0.14.8');
              // Update the current URL with the new version
              const fileName = getCurrentFileName();
              const baseUrl = getBaseUrl(fileName);
              setCurrentUrl(`${baseUrl}${fileName}`);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: terminologyVersion === '0.14.8' ? '#3b82f6' : 'transparent',
              color: terminologyVersion === '0.14.8' ? 'white' : '#6b7280',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            0.14.8
          </button>
          <button
            onClick={() => {
              setTerminologyVersion('0.14.9');
              // Update the current URL with the new version
              const fileName = getCurrentFileName();
              const baseUrl = getBaseUrl(fileName);
              setCurrentUrl(`${baseUrl}${fileName}`);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: terminologyVersion === '0.14.9' ? '#3b82f6' : 'transparent',
              color: terminologyVersion === '0.14.9' ? 'white' : '#6b7280',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            0.14.9
          </button>
        </div>
      </div>
      
      {/* Left sidebar with file list */}
      <div style={{
        width: '25%',
        minWidth: '250px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '16px',
        marginRight: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        marginTop: '48px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          marginBottom: '12px'
        }}>Available Files - Version {terminologyVersion}</h2>
        
        <div style={{
          position: 'relative',
          marginBottom: '16px'
        }}>
          <input
            type="text"
            placeholder="Search files..."
            style={{
              width: '100%',
              padding: '8px 8px 8px 32px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
            width: '16px',
            height: '16px'
          }} />
        </div>
        
        <div style={{
          overflowY: 'auto',
          flexGrow: 1
        }}>
          {filteredFiles.map((file, index) => (
            <div 
              key={index} 
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '6px',
                marginBottom: '2px',
                backgroundColor: getCurrentFileName() === file ? '#dbeafe' : 'transparent'
              }}
              onClick={() => handleFileSelect(file)}
            >
              <FileText style={{
                width: '16px',
                height: '16px',
                marginRight: '8px',
                color: '#3b82f6'
              }} />
              <span style={{
                fontSize: '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{file}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Right side with file content */}
      <div style={{
        width: '75%',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        marginTop: '48px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              margin: 0
            }}>
              {getCurrentFileName()}
            </h2>
          {!loading && !error && (
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '4px',
                marginBottom: 0
              }}>
                {isPartialData 
                  ? `Showing ${csvData.length} rows (partial data)` 
                  : `Total rows: ${csvData.length}`}
                  , Url: {currentUrl}
              </p>
            )}
          </div>
          <a 
            href={currentUrl}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#2563eb',
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            <Download style={{
              width: '16px',
              height: '16px',
              marginRight: '4px'
            }} />
            Download
          </a>
        </div>
        
        <div style={{
          padding: '16px',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '256px'
            }}>
              <Loader2 style={{
                width: '32px',
                height: '32px',
                color: '#3b82f6',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{
                marginTop: '8px',
                color: '#6b7280'
              }}>Loading CSV data...</p>
            </div>
          ) : error ? (
            <div style={{
              backgroundColor: '#fef2f2',
              padding: '16px',
              borderRadius: '6px'
            }}>
              <p style={{
                color: '#dc2626'
              }}>{error}</p>
            </div>
          ) : (
            <>
              <div style={{
                position: 'relative',
                marginBottom: '16px'
              }}>
                <input
                  type="text"
                  placeholder="Filter content..."
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                />
                <Search style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  width: '16px',
                  height: '16px'
                }} />
              </div>
              
              <div style={{
                overflowY: 'auto',
                flexGrow: 1
              }}>
                <table style={{
                  minWidth: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: '#f9fafb'
                  }}>
                    <tr>
                      {headers.map((header, index) => (
                        <th 
                          key={index}
                          style={{
                            padding: '12px 24px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData
                      .filter(row => {
                        if (!filterTerm) return true;
                        return row.some(cell => 
                          cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                        );
                      })
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((row, rowIndex) => (
                      <tr 
                        key={rowIndex}
                        style={{
                          backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb'
                        }}
                      >
                        {row.map((cell, cellIndex) => (
                          <td 
                            key={cellIndex}
                            style={{
                              padding: '8px 24px',
                              whiteSpace: 'nowrap',
                              fontSize: '14px',
                              color: '#6b7280',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderTop: '1px solid #e5e7eb',
                  marginTop: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px', fontSize: '14px' }}>Rows per page:</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value={500}>500</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        marginRight: '8px',
                        backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        color: currentPage === 1 ? '#9ca3af' : '#111827'
                      }}
                    >
                      Previous
                    </button>
                    
                    <span style={{ margin: '0 8px', fontSize: '14px' }}>
                      Page {currentPage} of {Math.ceil(csvData.filter(row => {
                        if (!filterTerm) return true;
                        return row.some(cell => 
                          cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                        );
                      }).length / pageSize) || 1}
                    </span>
                    
                    <button
                      onClick={() => {
                        const filteredData = csvData.filter(row => {
                          if (!filterTerm) return true;
                          return row.some(cell => 
                            cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                          );
                        });
                        const maxPage = Math.ceil(filteredData.length / pageSize) || 1;
                        setCurrentPage(prev => Math.min(prev + 1, maxPage));
                      }}
                      disabled={currentPage >= Math.ceil(csvData.filter(row => {
                        if (!filterTerm) return true;
                        return row.some(cell => 
                          cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                        );
                      }).length / pageSize) || 1}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: currentPage >= Math.ceil(csvData.filter(row => {
                          if (!filterTerm) return true;
                          return row.some(cell => 
                            cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                          );
                        }).length / pageSize) || 1 ? '#f3f4f6' : 'white',
                        cursor: currentPage >= Math.ceil(csvData.filter(row => {
                          if (!filterTerm) return true;
                          return row.some(cell => 
                            cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                          );
                        }).length / pageSize) || 1 ? 'not-allowed' : 'pointer',
                        color: currentPage >= Math.ceil(csvData.filter(row => {
                          if (!filterTerm) return true;
                          return row.some(cell => 
                            cell && String(cell).toLowerCase().includes(filterTerm.toLowerCase())
                          );
                        }).length / pageSize) || 1 ? '#9ca3af' : '#111827'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}