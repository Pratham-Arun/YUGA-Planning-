import { PageContainer } from '../components/layout/PageContainer';
import MonacoEditor from '@monaco-editor/react';
import { useState } from 'react';

export default function CodeEditor() {
  const [code, setCode] = useState('// Start coding here');

  return (
    <PageContainer title="Code Editor">
      <div className="h-[calc(100vh-12rem)] rounded-lg overflow-hidden">
        <MonacoEditor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            automaticLayout: true,
          }}
        />
      </div>
    </PageContainer>
  );
}