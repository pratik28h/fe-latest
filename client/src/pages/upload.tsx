import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CloudUpload,
  FileSpreadsheet,
  Database,
  Globe,
  CheckCircle2,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useFiles } from "@/contexts/FileContext";
import { uploadFile } from "@/api/upload";

interface FileUploadState {
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

export default function UploadPage() {
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const { addFile } = useFiles();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFileStates = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setFileStates(prev => [...prev, ...newFileStates]);

    acceptedFiles.forEach((file) => {
      let progress = 0;
      let cancelled = false;

      const interval = setInterval(() => {
        if (cancelled) return;

        progress += Math.random() * 25;
        if (progress >= 90) progress = 90;

        setFileStates(prev =>
          prev.map(f =>
            f.file === file ? { ...f, progress } : f
          )
        );
      }, 300);

      uploadFile(file)
        .then((result) => {
          cancelled = true;
          clearInterval(interval);

          addFile({
            id: result.file_id,
            name: result.filename,
            size: file.size,
            uploadedAt: new Date(),
            columns: result.columns,
            rows: result.rows,
          });

          setFileStates(prev =>
            prev.map(f =>
              f.file === file
                ? { ...f, progress: 100, status: "complete" }
                : f
            )
          );
        })
        .catch((error) => {
          cancelled = true;
          clearInterval(interval);

          setFileStates(prev =>
            prev.map(f =>
              f.file === file
                ? { ...f, status: "error", error: error.message }
                : f
            )
          );
        });
    });
  }, [addFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground">
          Import your raw data files
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
        `}
      >
        <input {...getInputProps()} />
        <CloudUpload className="mx-auto mb-4 size-8 text-primary" />
        <p className="font-semibold">Drop files here or click to upload</p>
        <p className="text-sm text-muted-foreground">
          CSV, Excel supported
        </p>
      </div>

      {fileStates.length > 0 && (
        <div className="space-y-3">
          {fileStates.map((fileState, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <FileSpreadsheet className="size-5 text-muted-foreground" />

                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium truncate">
                      {fileState.file.name}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {fileState.status}
                    </span>
                  </div>

                  {fileState.status === "error" ? (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="size-3" />
                      {fileState.error}
                    </div>
                  ) : fileState.status === "complete" ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle2 className="size-3" />
                      Uploaded successfully
                    </div>
                  ) : (
                    <Progress value={fileState.progress} className="h-1.5" />
                  )}
                </div>

                {fileState.status === "complete" && (
                  <Link href="/preview">
                    <Button size="sm" variant="outline">
                      Preview <ArrowRight className="ml-2 size-3" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase mb-3">
          Or connect to
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Database, name: "SQL Database" },
            { icon: Globe, name: "API Endpoint" },
            { icon: FileSpreadsheet, name: "Google Sheets" },
          ].map((item, i) => (
            <Button key={i} variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
              <item.icon className="size-5 text-muted-foreground" />
              <span className="font-semibold">{item.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
