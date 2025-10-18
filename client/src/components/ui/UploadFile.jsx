"use client";

import React, { memo, useCallback, useRef, useState } from "react";
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
  className,
  ...props
}) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  const accept = Array.isArray(acceptedFileTypes)
    ? acceptedFileTypes.join(", ")
    : acceptedFileTypes;

  const plainAcceptedTypes = acceptedFileTypes
    .map((type) => {
      return type.replace(/^.*\/|^\./g, "");
    })
    .join(", ");

  function filterFilesByType(selectedFiles) {
    return Array.from(selectedFiles).filter((file) => validateFileType(file));
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
        `File type not accepted: ${file.name}. Accepted types: ${acceptte}`
      );
    }
    return isValid;
  }

  const handleFiles = useCallback(
    (selected) => {
      const selectedFiles = Array.from(selected);
      const newFiles = multiple ? [...files, ...selectedFiles] : selectedFiles;
      const filteredFiles = filterFilesByType(newFiles);

      setFiles(filteredFiles);
      onFileUpload?.(filteredFiles);
    },
    [files, multiple, onFileUpload]
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
          "bg-white relative flex flex-col items-center justify-center p-6 mb-2 border-2 border-dashed hover:border-border-active rounded-sm transition-all cursor-pointer select-none overflow-hidden",
          isDragging && "border-border-active",
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
          }}
        />

        {/* Default center content */}
        <div className="flex flex-col items-center text-center text-muted-foreground">
          <UploadCloud className="w-10 h-10 mb-2 " />
          <p className="text-sm font-medium">
            {isDragging ? "Drop files here..." : "Drag & drop files here"}
          </p>
          <p className="text-xs mt-1">or click to browse</p>
          {displayAcceptedTypes && (
            <p className="text-xs mt-3">
              Accepted file types: {plainAcceptedTypes}
            </p>
          )}
        </div>
      </div>

      {/* When files are present */}
      {files.length > 0 && (
        <div className="relative w-full flex flex-col items-center gap-2">
          {preview && files.every(isImage) ? (
            <div className="flex items-center gap-3 w-full">
              {files.map((file, i) => {
                const url = URL.createObjectURL(file);
                return (
                  <div
                    key={i}
                    className="relative group rounded-sm overflow-hidden border  "
                  >
                    <img
                      src={url}
                      alt={file.name}
                      className="object-cover w-32 h-24"
                      onLoad={() => URL.revokeObjectURL(url)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white absolute top-1 right-1  rounded-full opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 px-1 "
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center w-full">
              <div className="flex items-center gap-1 w-full">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border rounded-full px-3 py-1 gap-3"
                  >
                    <span className="truncate text-sm ">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-0 rounded-full flex-shrink-0 h-auto hover:bg-none hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const UploadFile = memo(UploadFileComponent);
