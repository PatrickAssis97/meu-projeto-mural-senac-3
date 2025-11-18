import React, { useRef, useEffect } from 'react';

interface WysiwygEditorProps {
  content: string;
  setContent: (content: string) => void;
}

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ content, setContent }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== content) {
      editor.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const createLink = () => {
    const url = prompt('Digite a URL:');
    if (url) {
      execCmd('createLink', url);
    }
  };

  const toolbarButtons = [
    { cmd: 'bold', icon: 'B', title: 'Negrito' },
    { cmd: 'italic', icon: 'I', title: 'Itálico' },
    { cmd: 'underline', icon: 'U', title: 'Sublinhado' },
    { cmd: 'insertUnorderedList', icon: '•', title: 'Lista não ordenada' },
    { cmd: 'insertOrderedList', icon: '1.', title: 'Lista ordenada' },
    { cmd: 'createLink', icon: '🔗', title: 'Link', action: createLink },
  ];

  return (
    <div className="border border-gray-600 rounded-lg">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-800 rounded-t-lg border-b border-gray-600">
        {toolbarButtons.map(({ cmd, icon, title, action }) => (
          <button
            key={cmd}
            type="button"
            title={title}
            onClick={action ? action : () => execCmd(cmd)}
            className="w-8 h-8 rounded hover:bg-gray-700 text-white font-mono text-lg flex items-center justify-center"
          >
            {icon}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full min-h-[120px] p-2 bg-gray-700 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[#f58220]"
      />
    </div>
  );
};

export default WysiwygEditor;
