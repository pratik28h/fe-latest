import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Search,
  Filter,
  Download,
  Wand2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Database,
  Hash,
  BarChart3,
  FileText,
  Upload,
  Eye,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/* ================= CONFIG ================= */

const API_BASE = "http://localhost:8000/api/v1/data_sources";

// 🔴 DEV ONLY – hardcoded token
const DEV_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaWRkaGVzaDI5MDlAZ21haWwuY29tIiwiZXhwIjoxNzcxMzEzMDUzfQ.bzRRtcspXEH-h00PN9x9je53pjDAMtD3i00Am-UZSrg";

function authHeaders() {
  return {
    Authorization: `Bearer ${DEV_ACCESS_TOKEN}`,
  };
}

/* ================= TYPES ================= */

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

    // Determine column type
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

  // Calculate duplicates
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

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

/* ================= TABLE ================= */

function DataMetricsDisplay({ metrics }: { metrics: DataMetrics }) {
  const qualityScore = metrics.completeness >= 95 ? "Excellent" : 
                       metrics.completeness >= 80 ? "Good" : 
                       metrics.completeness >= 60 ? "Fair" : "Needs Work";
  
  const qualityColor = metrics.completeness >= 95 ? "text-green-600" : 
                       metrics.completeness >= 80 ? "text-blue-600" : 
                       metrics.completeness >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Quality Score Banner */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Data Quality Score</p>
            <p className={`text-4xl font-bold ${qualityColor}`}>
              {metrics.completeness.toFixed(1)}%
            </p>
            <Badge variant="outline" className="mt-2">
              {qualityScore}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="size-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Rows</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalRows.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="size-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Columns</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalColumns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="size-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Missing</span>
            </div>
            <p className="text-2xl font-bold">{metrics.missingValues}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="size-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Duplicates</span>
            </div>
            <p className="text-2xl font-bold">{metrics.duplicateRows}</p>
          </CardContent>
        </Card>
      </div>

      {/* Completeness Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Data Completeness</span>
            <span className={`text-sm font-bold ${qualityColor}`}>
              {metrics.completeness.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.completeness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.totalRows * metrics.totalColumns - metrics.missingValues} of {metrics.totalRows * metrics.totalColumns} cells filled
          </p>
        </CardContent>
      </Card>

      {/* Column Type Distribution */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="size-4" />
            Column Type Distribution
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Hash className="size-3" />
                  Numeric
                </Badge>
              </div>
              <span className="text-sm font-medium">{metrics.numericColumns}</span>
            </div>
            <Progress value={(metrics.numericColumns / metrics.totalColumns) * 100} className="h-1.5" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="size-3" />
                  Text
                </Badge>
              </div>
              <span className="text-sm font-medium">{metrics.textColumns}</span>
            </div>
            <Progress value={(metrics.textColumns / metrics.totalColumns) * 100} className="h-1.5" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <BarChart3 className="size-3" />
                  Date
                </Badge>
              </div>
              <span className="text-sm font-medium">{metrics.dateColumns}</span>
            </div>
            <Progress value={(metrics.dateColumns / metrics.totalColumns) * 100} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Issues Summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="size-4" />
            Data Issues
          </h3>
          <div className="space-y-2">
            {metrics.missingValues > 0 ? (
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="size-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Missing Values Detected</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.missingValues} cells need attention
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500 mt-0.5" />
                <p className="font-medium">No Missing Values</p>
              </div>
            )}
            
            {metrics.duplicateRows > 0 ? (
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="size-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Duplicate Rows Found</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.duplicateRows} duplicate entries
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500 mt-0.5" />
                <p className="font-medium">No Duplicates</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Column Quality Details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="size-4" />
            Column Quality Details
          </h3>
          <ScrollArea className="h-64">
            <div className="space-y-3 pr-4">
              {metrics.columnStats.map((col) => (
                <div key={col.name} className="space-y-2 pb-3 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate flex-1">{col.name}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {col.type}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Completeness</span>
                      <span className="font-medium">{(100 - col.missingPercent).toFixed(1)}%</span>
                    </div>
                    <Progress value={100 - col.missingPercent} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Unique: {col.unique.toLocaleString()}</span>
                    <span>Missing: {col.missing}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function DynamicTable({ fileData }: { fileData: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => {
    if (!fileData.length) return [];

    const helper = createColumnHelper<any>();
    return Object.keys(fileData[0]).slice(0, 10).map((key) =>
      helper.accessor(key, {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="-ml-4 h-8"
          >
            {key}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => <span>{String(info.getValue())}</span>,
      })
    );
  }, [fileData]);

  const table = useReactTable({
    data: fileData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2 py-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </>
  );
}

/* ================= PAGE ================= */

export default function PreviewPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileData, setFileData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<DataMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchAllFiles()
      .then(setFiles)
      .catch((e) => setError(e.message));
  }, []);

  async function handleSelectFile(file: any) {
    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFileData(file.filename);
      setFileData(data);
      const calculatedMetrics = calculateMetrics(data);
      setMetrics(calculatedMetrics);
    } catch (e: any) {
      setError(e.message);
      setFileData([]);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  function handleAutoClean() {
    if (selectedFile) {
      // Redirect to chat with filename as query parameter
      setLocation(`/chat?file=${encodeURIComponent(selectedFile.filename)}`);
    }
  }

  const filteredData = useMemo(() => {
    if (!searchTerm || !fileData.length) return fileData;
    
    return fileData.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [fileData, searchTerm]);

  if (!files.length) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-primary/10 p-6">
          <FileSpreadsheet className="size-12 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Files Yet</h2>
          <p className="text-muted-foreground mb-4">Upload your first file to get started with AI-powered analysis</p>
        </div>
        <Link href="/upload">
          <Button size="lg" className="gap-2">
            <Upload className="size-4" />
            Upload File
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6">
      {/* Sidebar */}
      <div className="w-80 border-r pr-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <Database className="size-4" />
            Your Files
          </h3>
          <Badge variant="secondary">{files.length}</Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {files.map((file) => (
              <Card
                key={file.filename}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                  selectedFile?.filename === file.filename
                    ? "border-primary shadow-md bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectFile(file)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.filename}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.created_at}
                      </p>
                      {selectedFile?.filename === file.filename && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          <Eye className="size-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-2 pt-4 border-t">
          <Link href="/upload">
            <Button variant="outline" className="w-full gap-2">
              <Upload className="size-4" />
              Upload New File
            </Button>
          </Link>
          {selectedFile && (
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              size="sm"
            >
              <Trash2 className="size-4" />
              Delete Selected
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selectedFile ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-8 mb-4">
              <Eye className="size-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Select a File to Preview</h2>
            <p className="text-muted-foreground max-w-md">
              Choose a file from the sidebar to view its data, quality metrics, and start analyzing with AI
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold truncate">{selectedFile.filename}</h1>
                  {metrics && (
                    <Badge variant="outline" className="hidden sm:flex">
                      {metrics.totalRows.toLocaleString()} rows × {metrics.totalColumns} cols
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Uploaded {selectedFile.created_at}
                  {metrics && ` • ${((metrics.totalRows * metrics.totalColumns * 8) / 1024).toFixed(2)} KB`}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="size-4" />
                  Export
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAutoClean}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Wand2 className="size-4" />
                  AI Clean & Chat
                </Button>
              </div>
            </div>

            {error && (
              <Card className="border-destructive">
                <CardContent className="p-4 flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-4" />
                  <span className="text-sm">{error}</span>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="size-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="size-4" />
                    Data Preview
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="gap-2">
                    <BarChart3 className="size-4" />
                    Quality Metrics
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="flex-1 flex flex-col gap-4 overflow-hidden mt-4">
                  {/* Search and Filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search in data…" 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="size-4" />
                      Filter
                    </Button>
                    {searchTerm && (
                      <Badge variant="secondary" className="px-3 py-1">
                        {filteredData.length} results
                      </Badge>
                    )}
                  </div>

                  {/* Data Table */}
                  <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardContent className="flex-1 p-0 overflow-auto">
                      <DynamicTable fileData={filteredData} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="metrics" className="flex-1 overflow-auto mt-4">
                  {metrics && <DataMetricsDisplay metrics={metrics} />}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
}