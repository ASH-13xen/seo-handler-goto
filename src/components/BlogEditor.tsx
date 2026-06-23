"use client";

import React from "react";
import { useEditor, EditorContent, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Upload,
  Undo,
  Redo,
  Table as TableIcon,
} from "lucide-react";

// Extends the stock Image node with `align`/`widthPct` attrs that render to the
// exact same inline float/width styles the old hand-rolled editor produced, so
// posts saved by the old editor keep rendering identically once reloaded here.
const AlignedImage = Image.extend({
  name: "image",
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element: HTMLElement) => {
          if (element.style.float === "left") return "left";
          if (element.style.float === "right") return "right";
          return "center";
        },
        renderHTML: () => ({}),
      },
      widthPct: {
        default: 60,
        parseHTML: (element: HTMLElement) => {
          const match = /([\d.]+)%/.exec(element.style.width || "");
          return match ? Number(match[1]) : 60;
        },
        renderHTML: () => ({}),
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const align = (node.attrs.align as string) || "center";
    const widthPct = (node.attrs.widthPct as number) || 60;
    const base = "border-radius:8px; max-width:100%; height:auto;";
    const style =
      align === "left"
        ? `${base} float:left; width:${widthPct}%; margin:6px 20px 14px 0;`
        : align === "right"
          ? `${base} float:right; width:${widthPct}%; margin:6px 0 14px 20px;`
          : `${base} display:block; margin:18px auto; width:${widthPct}%;`;
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style }),
    ];
  },
});

const FONT_FAMILIES = [
  { label: "Outfit", value: "Outfit, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "32px", "48px"];

const TOOLBAR_BTN =
  "px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors shadow-sm";
const TOOLBAR_BTN_ACTIVE =
  "px-2 py-1 rounded bg-indigo-600 border border-indigo-600 text-white transition-colors shadow-sm";

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
  siteId: string;
}

export default function BlogEditor({ value, onChange, siteId }: BlogEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      AlignedImage,
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Start writing your article…" }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "w-full h-[400px] overflow-y-auto bg-white text-slate-900 p-6 focus:outline-none tiptap-editor-content",
      },
    },
  });

  if (!editor) return null;

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("siteId", siteId || "general");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        alert("Failed to upload image.");
        return null;
      }
      const json = await res.json();
      return json.url as string;
    } catch (err) {
      console.error(err);
      alert("Upload error.");
      return null;
    }
  };

  const insertImage = async (file: File) => {
    const url = await uploadImage(file);
    if (!url) return;
    const altText =
      window.prompt("Descriptive image alt text (for SEO/Accessibility):") || "";
    const cleanAlt =
      altText.trim() ||
      file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: cleanAlt } as never)
      .run();
  };

  const replaceSelectedImage = async (file: File) => {
    const url = await uploadImage(file);
    if (!url) return;
    editor.chain().focus().updateAttributes("image", { src: url }).run();
  };

  const editSelectedImageAlt = () => {
    const currentAlt = editor.getAttributes("image").alt || "";
    const newAlt = window.prompt(
      "Descriptive image alt text (for SEO/Accessibility):",
      currentAlt,
    );
    if (newAlt !== null) {
      editor.chain().focus().updateAttributes("image", { alt: newAlt.trim() }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href || "https://";
    const url = window.prompt("Link URL (e.g. https://example.com):", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const imageActive = editor.isActive("image");
  const imageAttrs = editor.getAttributes("image");
  const tableActive = editor.isActive("table");

  return (
    <div className="rounded-lg border border-slate-850 bg-white overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex flex-wrap gap-1.5 items-center select-none shrink-0">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Undo (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={TOOLBAR_BTN}
        >
          <Undo className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Redo (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={TOOLBAR_BTN}
        >
          <Redo className="h-3 w-3" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Bold (Ctrl+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${editor.isActive("bold") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} font-bold text-xs`}
        >
          <Bold className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Italic (Ctrl+I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${editor.isActive("italic") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} text-xs`}
        >
          <Italic className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Underline (Ctrl+U)"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${editor.isActive("underline") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} text-xs`}
        >
          <UnderlineIcon className="h-3 w-3" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${editor.isActive("heading", { level: 2 }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} font-black text-[10px] uppercase`}
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${editor.isActive("heading", { level: 3 }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} font-bold text-[10px] uppercase`}
        >
          H3
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Normal Paragraph"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`${editor.isActive("paragraph") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} text-[10px]`}
        >
          Paragraph
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Unordered List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${editor.isActive("bulletList") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} text-[10px]`}
        >
          • Bullet List
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${editor.isActive("orderedList") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} text-[10px]`}
        >
          1. Number List
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${editor.isActive("blockquote") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN} text-[10px] italic font-semibold`}
        >
          Quote
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN}
        >
          <Strikethrough className="h-3 w-3" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Align Left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN}
        >
          <AlignLeft className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Align Center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN}
        >
          <AlignCenter className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Align Right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN}
        >
          <AlignRight className="h-3 w-3" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <select
          title="Font family"
          defaultValue=""
          onChange={(e) => {
            const font = e.target.value;
            if (font) editor.chain().focus().setFontFamily(font).run();
            e.target.value = "";
          }}
          className="px-1.5 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[10px] shadow-sm max-w-[90px]"
        >
          <option value="">Font</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          title="Font size"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run();
            e.target.value = "";
          }}
          className="px-1.5 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[10px] shadow-sm max-w-[70px]"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label
          title="Text color"
          className="px-1.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer flex items-center"
        >
          <input
            type="color"
            defaultValue="#1e293b"
            className="h-3.5 w-3.5 cursor-pointer border-none p-0 bg-transparent"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Insert Link"
          onClick={setLink}
          className={editor.isActive("link") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN}
        >
          <LinkIcon className="h-3 w-3" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />

        <label className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer text-[10px] font-bold shadow-sm flex items-center gap-1">
          <Upload className="h-3 w-3" />
          Add Body Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const inputEl = e.target;
              if (file) insertImage(file);
              inputEl.value = "";
            }}
          />
        </label>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          title="Insert Table"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold shadow-sm flex items-center gap-1"
        >
          <TableIcon className="h-3 w-3" />
          Insert Table
        </button>
      </div>

      {/* Image alignment & size toolbar — shown when an image is selected */}
      {imageActive && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-3 py-2 flex flex-wrap items-center gap-2 text-[10px] shrink-0">
          <span className="font-bold text-indigo-700">Image:</span>
          <div className="flex gap-1">
            {(
              [
                ["left", "⬅ Left"],
                ["center", "◻ Center"],
                ["right", "➡ Right"],
              ] as const
            ).map(([align, label]) => (
              <button
                key={align}
                type="button"
          onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().updateAttributes("image", { align }).run()}
                className={`px-2 py-1 rounded border font-bold transition-colors ${
                  (imageAttrs.align || "center") === align
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-indigo-200" />
          <span className="font-bold text-indigo-700">Size:</span>
          <div className="flex gap-1">
            {[25, 40, 60, 80, 100].map((pct) => (
              <button
                key={pct}
                type="button"
          onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  editor.chain().focus().updateAttributes("image", { widthPct: pct }).run()
                }
                className={`px-2 py-1 rounded border font-bold transition-colors ${
                  (imageAttrs.widthPct || 60) === pct
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-indigo-200" />
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={editSelectedImageAlt}
            className="px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-700 font-bold hover:bg-indigo-50"
          >
            Edit Alt Text
          </button>
          <label className="px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-700 font-bold hover:bg-indigo-50 cursor-pointer">
            Replace Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) replaceSelectedImage(file);
              }}
            />
          </label>
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className="px-2 py-1 rounded border border-red-200 bg-white text-red-600 font-bold hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      )}

      {/* Table toolbar — shown when the cursor is inside a table */}
      {tableActive && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex flex-wrap items-center gap-1.5 text-[10px] shrink-0">
          <span className="font-bold text-emerald-700">Table:</span>
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 font-bold hover:bg-emerald-100"
          >
            Add Row
          </button>
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 font-bold hover:bg-emerald-100"
          >
            Add Column
          </button>
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 font-bold hover:bg-emerald-100"
          >
            Delete Row
          </button>
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 font-bold hover:bg-emerald-100"
          >
            Delete Column
          </button>
          <button
            type="button"
          onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-1 rounded border border-red-200 bg-white text-red-600 font-bold hover:bg-red-50"
          >
            Delete Table
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      {/* Editor Tips Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 select-none shrink-0">
        <span>💡 Click an image to align/resize it, or click into a table for row/column controls.</span>
        <span className="font-bold text-indigo-600">Visual Editor Active</span>
      </div>
    </div>
  );
}
