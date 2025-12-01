"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function UploadFileComponent({
  acceptedFileTypes,
  onFileUpload,
  displayAcceptedTypes = false,
  multiple = false,
  preview = false,
  maxFileSize,
  minFileSize,
  className,
  value,
  ...props
}) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  const accept = Array.isArray(acceptedFileTypes)
    ? acceptedFileTypes.join(", ")
    : acceptedFileTypes;

  const plainAcceptedTypes = acceptedFileTypes
    ? acceptedFileTypes.map((type) => type.replace(/^.*\/|^\./g, "")).join(", ")
    : "";

  useEffect(() => {
    if (value) {
      setFiles(value);
    }
  }, [value]);

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function validateFileSize(file) {
    if (maxFileSize && file.size > maxFileSize) {
      toast.error(
        `File "${file.name}" exceeds the maximum size of ${formatBytes(
          maxFileSize
        )}`
      );
      return false;
    }
    if (minFileSize && file.size < minFileSize) {
      toast.error(
        `File "${file.name}" is smaller than the minimum size of ${formatBytes(
          minFileSize
        )}`
      );
      return false;
    }
    return true;
  }

  function validateFileType(file) {
    let isValid = false;
    if (!acceptedFileTypes) isValid = true; // No restrictions
    else {
      isValid = acceptedFileTypes.some((type) => {
        if (type.startsWith(".")) {
          // Extension check
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          // MIME type check
          return file.type === type;
        }
      });
    }

    if (!isValid) {
      toast.error(
        `File type not accepted: ${file.name}. Accepted types: ${plainAcceptedTypes}`
      );
    }
    return isValid;
  }

  function filterFiles(selectedFiles) {
    return Array.from(selectedFiles).filter(
      (file) => validateFileType(file) && validateFileSize(file)
    );
  }

  const handleFiles = useCallback(
    (selected) => {
      const selectedFiles = Array.from(selected);
      const validFiles = filterFiles(selectedFiles);

      if (validFiles.length === 0) return;

      const newFiles = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(newFiles);
      onFileUpload?.(newFiles);
    },
    [files, multiple, onFileUpload, maxFileSize, minFileSize, acceptedFileTypes]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length) handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const removeFile = useCallback(
    (index) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onFileUpload?.(newFiles);
    },
    [files, onFileUpload]
  );

  const isImage = (file) => file.type.startsWith("image/");

  return (
    <div className="w-full">
      <div
        {...props}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        className={cn(
          "bg-background relative flex flex-col items-center justify-center p-8 mb-4 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 rounded-lg transition-all cursor-pointer select-none overflow-hidden group",
          isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20",
          className
        )}
      >
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const selected = e.target.files;
            if (selected.length) handleFiles(selected);
            // Reset value to allow re-selecting same file
            e.target.value = null;
          }}
        />

        {/* Default center content */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            className={cn(
              "p-4 rounded-full bg-muted transition-colors group-hover:bg-background",
              isDragging && "bg-background"
            )}
          >
            <UploadCloud
              className={cn(
                "w-8 h-8 text-muted-foreground transition-colors group-hover:text-primary",
                isDragging && "text-primary"
              )}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {isDragging
                ? "Drop files now"
                : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              {plainAcceptedTypes && `Accepted: ${plainAcceptedTypes}`}
              {plainAcceptedTypes && maxFileSize && " • "}
              {maxFileSize && `Max size: ${formatBytes(maxFileSize)}`}
            </p>
          </div>
        </div>
      </div>

      {/* When files are present */}
      {files.length > 0 && (
        <div className="relative w-full flex flex-col items-center gap-2">
          {preview && files.every(isImage) ? (
            <div className="flex items-center gap-3 w-full flex-wrap">
              {files.map((file, i) => {
                const url = URL.createObjectURL(file);
                return (
                  <div
                    key={i}
                    className="relative group rounded-md overflow-hidden border bg-background shadow-sm"
                  >
                    <img
                      src={url}
                      alt={file.name}
                      className="object-cover w-32 h-24"
                      onLoad={() => URL.revokeObjectURL(url)}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-md bg-card shadow-sm group hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-md bg-muted">
                      <UploadCloud className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export const UploadFile = memo(UploadFileComponent);
