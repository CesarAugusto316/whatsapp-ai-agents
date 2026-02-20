"use client";

import { Copy, Check, BookTemplate } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
}

const mockTemplates: PromptTemplate[] = [
  {
    id: "1",
    title: "Code Review",
    description: "Review code for best practices and potential issues",
    category: "Development",
    prompt:
      "Please review the following code for best practices, potential bugs, performance issues, and suggest improvements:\n\n[Insert code here]",
  },
  {
    id: "2",
    title: "Explain Concept",
    description: "Break down complex topics in simple terms",
    category: "Learning",
    prompt:
      "Explain [concept] in simple terms. Include:\n1. A brief definition\n2. Key components\n3. Real-world examples\n4. Common use cases",
  },
  {
    id: "3",
    title: "Write Documentation",
    description: "Generate clear and comprehensive documentation",
    category: "Development",
    prompt:
      "Write comprehensive documentation for the following feature/code. Include:\n- Overview\n- Parameters/Inputs\n- Return values\n- Examples\n- Edge cases",
  },
  {
    id: "4",
    title: "Debug Helper",
    description: "Identify and fix bugs in your code",
    category: "Development",
    prompt:
      "I'm experiencing an issue with the following code:\n[Insert code]\n\nExpected behavior: [Describe]\nActual behavior: [Describe]\n\nHelp me identify and fix the issue.",
  },
  {
    id: "5",
    title: "SQL Query Builder",
    description: "Generate optimized SQL queries",
    category: "Database",
    prompt:
      "Write an optimized SQL query to:\n[Describe what you need]\n\nTables available:\n[List your tables and columns]",
  },
  {
    id: "6",
    title: "API Design",
    description: "Design RESTful API endpoints",
    category: "Development",
    prompt:
      "Design a RESTful API for [resource]. Include:\n- Endpoints\n- HTTP methods\n- Request/response formats\n- Error handling\n- Authentication requirements",
  },
];

const categories = Array.from(new Set(mockTemplates.map((t) => t.category)));

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrompt = async (template: PromptTemplate) => {
    await navigator.clipboard.writeText(template.prompt);
    setCopiedId(template.id);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex size-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Prompt Templates</h1>
        <p className="text-muted-foreground text-sm">
          Pre-built prompts to accelerate your workflow
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Templates List */}
        <div className="w-80 border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="mb-4 font-semibold text-sm">All Templates</h2>
            <div className="space-y-2">
              {mockTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "bg-muted border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  type="button"
                >
                  <div className="font-medium text-sm">{template.title}</div>
                  <div className="text-muted-foreground line-clamp-1 text-xs">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTemplate ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {selectedTemplate.category}
                  </span>
                </div>
                <h2 className="text-2xl font-bold">{selectedTemplate.title}</h2>
                <p className="text-muted-foreground mt-2">
                  {selectedTemplate.description}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Prompt Template</h3>
                  <button
                    onClick={() => handleCopyPrompt(selectedTemplate)}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                    type="button"
                  >
                    {copiedId === selectedTemplate.id ? (
                      <>
                        <Check className="size-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {selectedTemplate.prompt}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-4 text-center">
              <BookTemplate className="text-muted-foreground size-16" />
              <div>
                <h3 className="font-medium text-lg">Select a template</h3>
                <p className="text-muted-foreground text-sm">
                  Choose a prompt template from the list to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
