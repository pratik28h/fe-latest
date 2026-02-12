import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Send, 
  Bot, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  Sparkles,
  Eye,
  Save,
  Undo2,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ================= CONFIG ================= */

const API_BASE = "http://localhost:8000/api/v1/data_sources";


// 🔴 DEV ONLY – hardcoded token
const DEV_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaWRkaGVzaDI5MDlAZ21haWwuY29tIiwiZXhwIjoxNzcxMzEzMDUzfQ.bzRRtcspXEH-h00PN9x9je53pjDAMtD3i00Am-UZSrg";

function authHeaders() {
  return {
    Authorization: `Bearer ${DEV_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/* ================= TYPES ================= */

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  preview?: PreviewData;
  operationResult?: OperationResult;
};

type PreviewData = {
  operation: string;
  parsed_query?: any;
  preview: {
    original: any[];
    processed: any[];
  };
  statistics: {
    original_shape: number[];
    processed_shape: number[];
    rows_affected: number;
    columns_affected: number;
  };
};

type OperationResult = {
  message: string;
  operation: string;
  query: string;
  version_id: string;
  statistics: {
    original: {
      rows: number;
      columns: number;
      missing_values: number;
    };
    processed: {
      rows: number;
      columns: number;
      missing_values: number;
    };
    changes: {
      rows_changed: number;
      columns_changed: number;
      missing_values_changed: number;
    };
  };
};

type DataMetrics = {
  totalRows: number;
  totalColumns: number;
  missingValues: number;
  duplicateRows: number;
  completeness: number;
  numericColumns: number;
  textColumns: number;
  dateColumns: number;
  columnStats: Array<{
    name: string;
    type: string;
    missing: number;
    missingPercent: number;
    unique: number;
  }>;
};

/* ================= API ================= */

async function fetchAllFiles() {
  const res = await fetch(`${API_BASE}/all`, {
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch files");

  const json = await res.json();
  return json.files;
}

async function fetchFileData(filename: string) {
  const res = await fetch(
    `${API_BASE}/get-file/${encodeURIComponent(filename)}`,
    { headers: authHeaders() }
  );

  if (!res.ok) throw new Error("Failed to fetch file data");

  const json = await res.json();
  return json.content ?? json;
}

async function previewPreprocessing(filename: string, query: string, token: string) {
  const res = await fetch(`${API_BASE}/preview`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      filename,
      query,
      token
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to preview preprocessing");
  }

  return res.json();
}

async function applyPreprocessing(filename: string, query: string, token: string) {
  const res = await fetch(`${API_BASE}/preprocess`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      filename,
      query,
      token
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to apply preprocessing");
  }

  return res.json();
}

/* ================= UTILITY FUNCTIONS ================= */

function calculateMetrics(data: any[]): DataMetrics {
  if (!data || data.length === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      missingValues: 0,
      duplicateRows: 0,
      completeness: 100,
      numericColumns: 0,
      textColumns: 0,
      dateColumns: 0,
      columnStats: [],
    };
  }

  const columns = Object.keys(data[0]);
  const totalRows = data.length;
  const totalColumns = columns.length;
  
  let totalMissing = 0;
  let numericColumns = 0;
  let textColumns = 0;
  let dateColumns = 0;

  const columnStats = columns.map(col => {
    const values = data.map(row => row[col]);
    const missing = values.filter(v => 
      v === null || 
      v === undefined || 
      v === '' || 
      v === 'None' || 
      v === 'null' ||
      v === 'NaN'
    ).length;
    
    totalMissing += missing;

    let type = 'text';
    const nonNullValues = values.filter(v => 
      v !== null && 
      v !== undefined && 
      v !== '' && 
      v !== 'None'
    );

    if (nonNullValues.length > 0) {
      const sample = nonNullValues[0];
      if (!isNaN(Number(sample)) && sample !== '') {
        type = 'numeric';
        numericColumns++;
      } else if (isValidDate(sample)) {
        type = 'date';
        dateColumns++;
      } else {
        textColumns++;
      }
    } else {
      textColumns++;
    }

    const unique = new Set(values.filter(v => v !== null && v !== undefined)).size;

    return {
      name: col,
      type,
      missing,
      missingPercent: (missing / totalRows) * 100,
      unique,
    };
  });

  const uniqueRows = new Set(data.map(row => JSON.stringify(row)));
  const duplicateRows = totalRows - uniqueRows.size;

  const completeness = totalColumns * totalRows > 0 
    ? ((totalColumns * totalRows - totalMissing) / (totalColumns * totalRows)) * 100 
    : 100;

  return {
    totalRows,
    totalColumns,
    missingValues: totalMissing,
    duplicateRows,
    completeness,
    numericColumns,
    textColumns,
    dateColumns,
    columnStats,
  };
}

function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function isPreprocessingQuery(query: string): boolean {
  const preprocessingKeywords = [
    'fill', 'missing', 'null', 'drop', 'remove', 'duplicate',
    'clean', 'normalize', 'standardize', 'outlier', 'filter',
    'sort', 'encode', 'categorical', 'convert', 'lowercase',
    'uppercase', 'trim', 'whitespace', 'handle', 'delete'
  ];
  
  const lowerQuery = query.toLowerCase();
  return preprocessingKeywords.some(keyword => lowerQuery.includes(keyword));
}

/* ================= FILE SELECTOR ================= */

function FileSelector({ 
  files, 
  onSelectFile, 
  selectedFilename 
}: { 
  files: any[]; 
  onSelectFile: (filename: string) => void;
  selectedFilename: string;
}) {
  return (
    <Card className="p-6">
      <CardTitle className="mb-4 flex items-center gap-2">
        <Database className="size-5" />
        Select a file to analyze
      </CardTitle>
      <div className="space-y-2">
        {files.map((file) => (
          <Card
            key={file.filename}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFilename === file.filename
                ? "border-primary shadow-sm bg-primary/5"
                : ""
            }`}
            onClick={() => onSelectFile(file.filename)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="size-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{file.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {file.created_at}
                  </p>
                </div>
                {selectedFilename === file.filename && (
                  <CheckCircle2 className="size-5 text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Card>
  );
}

/* ================= MAIN PAGE ================= */

export default function ChatPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const fileFromUrl = searchParams.get("file") || "";

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<DataMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(true);
  
  // Preprocessing states
  const [currentPreview, setCurrentPreview] = useState<PreviewData | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load all files on mount
  useEffect(() => {
    fetchAllFiles()
      .then((fetchedFiles) => {
        setFiles(fetchedFiles);
        setFilesLoading(false);
        
        if (fileFromUrl) {
          setSelectedFilename(decodeURIComponent(fileFromUrl));
        }
      })
      .catch((e) => {
        console.error("Failed to load files:", e);
        setFilesLoading(false);
      });
  }, [fileFromUrl]);

  // Load file data when filename is selected
  useEffect(() => {
    if (selectedFilename) {
      setLoading(true);
      fetchFileData(selectedFilename)
        .then((data) => {
          setFileData(data);
          const calculatedMetrics = calculateMetrics(data);
          setMetrics(calculatedMetrics);
          
          if (messages.length === 0) {
            setMessages([
              {
                id: "1",
                role: "assistant",
                content: `Hello! I've loaded "${selectedFilename}". I can see it has ${data.length.toLocaleString()} rows and ${Object.keys(data[0] || {}).length} columns with ${calculatedMetrics.completeness.toFixed(1)}% data completeness.

I can help you with:
✨ Data preprocessing (fill missing, remove duplicates, clean text)
📊 Data analysis and insights
🔧 Data transformations

What would you like to do?`,
              },
            ]);
          }
          
          setLoading(false);
        })
        .catch((e) => {
          console.error("Failed to load file:", e);
          setLoading(false);
        });
    }
  }, [selectedFilename]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSelectFile = (filename: string) => {
    setSelectedFilename(filename);
    setMessages([]);
    setCurrentPreview(null);
  };

  const reloadFileData = async () => {
    if (selectedFilename) {
      try {
        const data = await fetchFileData(selectedFilename);
        setFileData(data);
        const calculatedMetrics = calculateMetrics(data);
        setMetrics(calculatedMetrics);
      } catch (error) {
        console.error("Failed to reload file data:", error);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedFilename) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = input;
    setInput("");
    setIsTyping(true);

    // Check if this is a preprocessing query
    if (isPreprocessingQuery(query)) {
      try {
        // Get preview first
        const preview = await previewPreprocessing(selectedFilename, query, DEV_ACCESS_TOKEN);
        setCurrentPreview(preview);
        setCurrentQuery(query);
        
        // Show AI response with preview
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I can help you with that! I'll ${preview.operation.replace(/_/g, ' ')} on your data.

📊 Preview Impact:
• Rows: ${preview.statistics.original_shape[0]} → ${preview.statistics.processed_shape[0]} (${preview.statistics.rows_affected >= 0 ? '+' : ''}${preview.statistics.rows_affected})
• Columns: ${preview.statistics.original_shape[1]} → ${preview.statistics.processed_shape[1]} (${preview.statistics.columns_affected >= 0 ? '+' : ''}${preview.statistics.columns_affected})

Check the preview in the "Preview" tab and click "Save Changes" to apply!`,
          preview: preview,
        };

        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        
      } catch (error: any) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ Error: ${error.message}

Please try rephrasing your request. Examples:
• "Fill missing values in age with mean"
• "Remove duplicate rows"
• "Normalize price column"
• "Filter rows where age > 18"`,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsTyping(false);
      }
    } else {
      // Regular analysis query
      setTimeout(() => {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: generateAIResponse(query, metrics),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleApplyPreprocessing = async () => {
    if (!currentQuery || !selectedFilename) return;

    setIsApplying(true);

    try {
      const result = await applyPreprocessing(selectedFilename, currentQuery, DEV_ACCESS_TOKEN);
      
      // Reload file data
      await reloadFileData();
      
      // Clear preview
      setCurrentPreview(null);
      
      // Add success message
      const successMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `✅ ${result.message}

📊 Changes Applied:
• Operation: ${result.operation.replace(/_/g, ' ')}
• Version ID: ${result.version_id}

Statistics:
• Rows: ${result.statistics.original.rows} → ${result.statistics.processed.rows} (${result.statistics.changes.rows_changed >= 0 ? '+' : ''}${result.statistics.changes.rows_changed})
• Columns: ${result.statistics.original.columns} → ${result.statistics.processed.columns} (${result.statistics.changes.columns_changed >= 0 ? '+' : ''}${result.statistics.changes.columns_changed})
• Missing values: ${result.statistics.original.missing_values} → ${result.statistics.processed.missing_values} (${result.statistics.changes.missing_values_changed >= 0 ? '+' : ''}${result.statistics.changes.missing_values_changed})

Your data has been updated! 🎉`,
        operationResult: result,
      };

      setMessages((prev) => [...prev, successMsg]);
      setCurrentQuery("");
      
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `❌ Failed to apply changes: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Enhanced AI response generator
  function generateAIResponse(query: string, metrics: DataMetrics | null): string {
    const q = query.toLowerCase();
    
    if (!metrics) return "Please select a file first to analyze the data.";
    
    if (q.includes("missing") || q.includes("null")) {
      const topMissingCols = metrics.columnStats
        .filter(c => c.missing > 0)
        .sort((a, b) => b.missingPercent - a.missingPercent)
        .slice(0, 3);
      
      if (topMissingCols.length === 0) {
        return "Great news! Your dataset has no missing values. All columns are 100% complete! 🎉";
      }
      
      return `Your data has ${metrics.missingValues} missing values (${(100 - metrics.completeness).toFixed(1)}% of total data). Top columns with missing data:

${topMissingCols.map(c => `• ${c.name}: ${c.missing} missing (${c.missingPercent.toFixed(1)}%)`).join('\n')}

💡 To fix this, you can say:
"Fill missing values in ${topMissingCols[0].name} with mean"`;
    }
    
    if (q.includes("duplicate")) {
      if (metrics.duplicateRows === 0) {
        return "Excellent! I found no duplicate rows in your dataset. Your data is clean! ✓";
      }
      return `I found ${metrics.duplicateRows} duplicate rows (${((metrics.duplicateRows / metrics.totalRows) * 100).toFixed(1)}% of total).

💡 To remove them: "Remove duplicate rows"`;
    }
    
    if (q.includes("column") || q.includes("field")) {
      return `Your dataset has ${metrics.totalColumns} columns:
• ${metrics.numericColumns} numeric columns
• ${metrics.textColumns} text columns
• ${metrics.dateColumns} date columns

Which columns would you like to explore?`;
    }
    
    if (q.includes("summary") || q.includes("overview") || q.includes("quality")) {
      const quality = metrics.completeness >= 95 ? "Excellent" : 
                     metrics.completeness >= 80 ? "Good" : 
                     metrics.completeness >= 60 ? "Fair" : "Needs Improvement";
      
      const suggestions = [];
      if (metrics.missingValues > 0) suggestions.push("Fill or remove missing values");
      if (metrics.duplicateRows > 0) suggestions.push("Remove duplicate rows");
      
      return `📊 Data Quality Report:

✓ Total rows: ${metrics.totalRows.toLocaleString()}
✓ Columns: ${metrics.totalColumns}
✓ Completeness: ${metrics.completeness.toFixed(1)}% (${quality})
✓ Missing values: ${metrics.missingValues}
✓ Duplicates: ${metrics.duplicateRows}

${suggestions.length > 0 ? `\n💡 Suggestions:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '\n✅ Your data looks clean!'}`;
    }
    
    return `I can help you analyze and transform your data. Try:

• "Show missing values"
• "Remove duplicates"
• "Fill missing with mean"
• "Data quality overview"

What would you like to do?`;
  }

  if (filesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <RefreshCw className="size-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your files...</p>
        </div>
      </div>
    );
  }

  if (!selectedFilename && !fileFromUrl && files.length > 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <FileSelector 
          files={files} 
          onSelectFile={handleSelectFile}
          selectedFilename={selectedFilename}
        />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
        <Database className="size-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Files Yet</h2>
        <p className="text-muted-foreground">Upload a file to start analyzing with AI</p>
      </div>
    );
  }

  if (fileFromUrl && !selectedFilename && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <RefreshCw className="size-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {fileFromUrl}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{selectedFilename}</h1>
            <Select value={selectedFilename} onValueChange={handleSelectFile}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {files.map((file) => (
                  <SelectItem key={file.filename} value={file.filename}>
                    {file.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fileData.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {fileData.length.toLocaleString()} rows • {Object.keys(fileData[0] || {}).length} cols
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="size-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
            {/* Data Preview - 2 columns */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="size-4" />
                      Data Preview
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reloadFileData}
                      className="h-7"
                    >
                      <RefreshCw className="size-3 mr-1" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-auto">
                  {fileData.length > 0 ? (
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          {Object.keys(fileData[0]).slice(0, 10).map((key) => (
                            <TableHead key={key} className="font-semibold">
                              {key}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileData.slice(0, 100).map((row, idx) => (
                          <TableRow key={idx}>
                            {Object.keys(fileData[0])
                              .slice(0, 10)
                              .map((key) => (
                                <TableCell key={key} className="text-sm">
                                  {String(row[key])}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Assistant Panel - 1 column */}
            <div className="flex flex-col overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="size-5 text-primary" />
                    AI Assistant
                    <Badge variant="secondary" className="ml-auto text-xs">
                      <Sparkles className="size-3 mr-1" />
                      Preprocessing
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                  <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-3 mt-3">
                      <TabsTrigger value="chat" className="flex-1">
                        <Bot className="size-3 mr-1" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex-1" disabled={!currentPreview}>
                        <Eye className="size-3 mr-1" />
                        Preview
                        {currentPreview && (
                          <Badge variant="destructive" className="ml-1 size-1.5 p-0 rounded-full" />
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Chat Tab */}
                    <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4 pb-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-3 ${
                                msg.role === "user" ? "flex-row-reverse" : ""
                              }`}
                            >
                              <Avatar className="size-8 border shrink-0">
                                {msg.role === "assistant" ? (
                                  <div className="bg-primary w-full h-full flex items-center justify-center text-primary-foreground">
                                    <Bot className="size-4" />
                                  </div>
                                ) : (
                                  <AvatarFallback className="text-xs">You</AvatarFallback>
                                )}
                              </Avatar>

                              <div
                                className={`p-3 rounded-lg text-sm max-w-[85%] ${
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-secondary rounded-bl-sm"
                                }`}
                              >
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              </div>
                            </div>
                          ))}

                          {isTyping && (
                            <div className="flex gap-3">
                              <Avatar className="size-8 border">
                                <div className="bg-primary w-full h-full flex items-center justify-center text-primary-foreground">
                                  <Bot className="size-4" />
                                </div>
                              </Avatar>
                              <div className="bg-secondary p-3 rounded-lg rounded-bl-sm flex items-center gap-2">
                                <div className="size-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="size-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="size-1.5 bg-foreground/40 rounded-full animate-bounce"></div>
                              </div>
                            </div>
                          )}
                          <div ref={scrollRef} />
                        </div>
                      </ScrollArea>

                      {/* Input Area */}
                      <div className="p-3 border-t bg-background">
                        <div className="relative">
                          <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your data or request preprocessing..."
                            className="min-h-[60px] pr-10 resize-none text-sm"
                            disabled={!selectedFilename}
                          />
                          <Button
                            size="icon"
                            className="absolute right-1 bottom-1 size-7"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping || !selectedFilename}
                          >
                            <Send className="size-3" />
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[
                            "Show missing values",
                            "Remove duplicates",
                            "Fill missing with mean",
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setInput(suggestion)}
                              className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                              disabled={!selectedFilename}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="flex-1 flex flex-col overflow-hidden m-0">
                      {currentPreview ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                              {/* Stats Alert */}
                              <Alert>
                                <Info className="size-4" />
                                <AlertTitle>Operation: {currentPreview.operation.replace(/_/g, ' ')}</AlertTitle>
                                <AlertDescription className="mt-2 space-y-1 text-xs">
                                  <div>Rows: {currentPreview.statistics.original_shape[0]} → {currentPreview.statistics.processed_shape[0]}</div>
                                  <div>Columns: {currentPreview.statistics.original_shape[1]} → {currentPreview.statistics.processed_shape[1]}</div>
                                </AlertDescription>
                              </Alert>

                              {/* Before Data */}
                              <div>
                                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                  <Database className="size-3" />
                                  Before (5 rows)
                                </h4>
                                <div className="border rounded overflow-auto max-h-48 text-xs">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        {Object.keys(currentPreview.preview.original[0] || {}).slice(0, 5).map((key) => (
                                          <TableHead key={key} className="text-xs h-8">{key}</TableHead>
                                        ))}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {currentPreview.preview.original.slice(0, 5).map((row, idx) => (
                                        <TableRow key={idx}>
                                          {Object.values(row).slice(0, 5).map((val, i) => (
                                            <TableCell key={i} className="text-xs py-1">
                                              {String(val)}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* After Data */}
                              <div>
                                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                  <Sparkles className="size-3 text-primary" />
                                  After (5 rows)
                                </h4>
                                <div className="border border-primary/50 rounded overflow-auto max-h-48 text-xs">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        {Object.keys(currentPreview.preview.processed[0] || {}).slice(0, 5).map((key) => (
                                          <TableHead key={key} className="text-xs h-8">{key}</TableHead>
                                        ))}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {currentPreview.preview.processed.slice(0, 5).map((row, idx) => (
                                        <TableRow key={idx}>
                                          {Object.values(row).slice(0, 5).map((val, i) => (
                                            <TableCell key={i} className="text-xs py-1">
                                              {String(val)}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>

                          {/* Action Buttons */}
                          <div className="p-3 border-t bg-background flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCurrentPreview(null);
                              }}
                              disabled={isApplying}
                              className="flex-1"
                            >
                              <Undo2 className="size-3 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleApplyPreprocessing}
                              disabled={isApplying}
                              className="flex-1"
                            >
                              {isApplying ? (
                                <>
                                  <RefreshCw className="size-3 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="size-3 mr-1" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
                          <div className="text-center">
                            <Eye className="size-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No preview available</p>
                            <p className="text-xs mt-1">Request a preprocessing operation to see preview</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}