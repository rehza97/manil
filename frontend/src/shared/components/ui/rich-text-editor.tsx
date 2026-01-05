import React, { useRef, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/shared/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showToolbar?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  disabled = false,
  showToolbar = true,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML || "");
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const ToolbarButton = ({ 
    onClick, 
    icon: Icon, 
    title, 
    isActive = false 
  }: { 
    onClick: () => void; 
    icon: React.ComponentType<{ className?: string }>; 
    title: string;
    isActive?: boolean;
  }) => (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className="h-8 w-8 p-0"
      title={title}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={cn("relative border rounded-md", className)}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b bg-muted/50 rounded-t-md">
          <ToolbarButton
            onClick={() => execCommand("bold")}
            icon={Bold}
            title="Bold (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => execCommand("italic")}
            icon={Italic}
            title="Italic (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => execCommand("underline")}
            icon={Underline}
            title="Underline (Ctrl+U)"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton
            onClick={() => execCommand("insertUnorderedList")}
            icon={List}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => execCommand("insertOrderedList")}
            icon={ListOrdered}
            title="Numbered List"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton
            onClick={() => execCommand("justifyLeft")}
            icon={AlignLeft}
            title="Align Left"
          />
          <ToolbarButton
            onClick={() => execCommand("justifyCenter")}
            icon={AlignCenter}
            title="Align Center"
          />
          <ToolbarButton
            onClick={() => execCommand("justifyRight")}
            icon={AlignRight}
            title="Align Right"
          />
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className={cn(
          "min-h-[120px] w-full rounded-md bg-background px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "prose prose-sm max-w-none",
          disabled && "cursor-not-allowed opacity-50",
          showToolbar ? "rounded-t-none" : "border border-input"
        )}
        data-placeholder={placeholder}
        style={{
          minHeight: "120px",
        }}
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
};

