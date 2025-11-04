import React from 'react';
import MonacoEditor from '@monaco-editor/react';

export default function ScriptEditor() {
    const handleEditorChange = (value, event) => {
        // Handle code changes
    };

    return (
        <MonacoEditor
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// Your code here"
            theme="vs-dark"
            onChange={handleEditorChange}
            options={{
                minimap: { enabled: true },
                fontSize: 14,
                automaticLayout: true,
            }}
        />
    );
}