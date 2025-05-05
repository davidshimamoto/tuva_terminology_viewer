import { useState, useEffect } from 'react';
import { Search, Download, FileText, Loader2 } from 'lucide-react';
import * as Papa from 'papaparse';
import pako from 'pako';

export default function CSVViewer() {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('https://tuva-public-resources.s3.amazonaws.com/versioned_terminology/0.14.9/discharge_disposition.csv_0_0_0.csv.gz');
  const [similarFiles, setSimilarFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  

  const version = '0.14.9';
  const baseUrl = 'https://tuva-public-resources.s3.amazonaws.com/versioned_terminology/' + version + '/';


  // Sample similar files that might exist at the same path
  const possibleSimilarFiles = [
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
    'hchs_level_2.csv_0_0_0.csv.gz',
    'hcpcs_to_rbcs.csv_0_0_0.csv.gz',
    'icd_10_pcs_csm_ontology.csv_0_0_0.csv.gz',
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
    'terminology_seeds.csv_0_0_0.csv.gz',
  ];

  // Initialize similar files
  useEffect(() => {
    setSimilarFiles(possibleSimilarFiles);
  }, []);

  const fetchAndProcessCSV = async (url) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the gzipped file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      // Get the compressed data as ArrayBuffer
      const compressedData = await response.arrayBuffer();
      
      // Decompress the data using pako
      const decompressed = pako.inflate(new Uint8Array(compressedData));
      
      // Convert Uint8Array to string
      const decoder = new TextDecoder('utf-8');
      const csvString = decoder.decode(decompressed);
      
      // Parse the CSV data without headers
      Papa.parse(csvString, {
        header: false, // Changed to false since files don't have headers
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setCsvData(results.data);
            
            // Generate column placeholders based on the number of columns in the first row
            if (results.data[0] && Array.isArray(results.data[0])) {
              const columnCount = results.data[0].length;
              const placeholderHeaders = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
              setHeaders(placeholderHeaders);
            } else {
              setError('Unable to determine column structure');
            }
          } else {
            setError('No data found in the CSV file');
          }
          setLoading(false);
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndProcessCSV(currentUrl);
  }, [currentUrl]);

  const handleFileSelect = (filename) => {
    setCurrentUrl(`${baseUrl}${filename}`);
  };

  const filteredFiles = similarFiles.filter(file => 
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
      <h1 style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        margin: 0,
        zIndex: 10
      }}>Tuva Terminology Viewer</h1>
      
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
        }}>Available Files - Version {version}</h2>
        
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
                <b>Total rows:</b> {csvData.length}, <b>Base URL:</b> <i>{baseUrl}</i> 
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}