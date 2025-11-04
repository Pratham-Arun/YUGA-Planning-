import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AIProvider } from './contexts/AIContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Editor from './views/Editor';
import AIAssistant from './views/AIAssistant';
import ProjectCreator from './views/ProjectCreator';
import Settings from './views/Settings';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AIProvider>
            <ProjectProvider>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route path="editor/*" element={<Editor />} />
                      <Route path="ai-assistant" element={<AIAssistant />} />
                      <Route path="new-project" element={<ProjectCreator />} />
                      <Route path="settings" element={<Settings />} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              } />
            </Routes>
            </ProjectProvider>
          </AIProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;