import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface User {
  id: number;
  username: string;
  email: string;
}

interface FileItem {
  id: number;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showLogin, setShowLogin] = useState(true);

  // Login/Register form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadFiles();
    }
  }, []);

  const loadFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/files`);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error loading files:', error);
      setMessage('שגיאה בטעינת הקבצים');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });

      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      setMessage('התחברת בהצלחה!');
      loadFiles();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username,
        email,
        password
      });

      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      setMessage('נרשמת בהצלחה!');
      loadFiles();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'שגיאה ברישום');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setFiles([]);
    setMessage('התנתקת בהצלחה');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/api/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('הקובץ הועלה בהצלחה!');
      loadFiles();
      
      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'שגיאה בהעלאת הקובץ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDownload = async (fileId: number, originalName: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/files/${fileId}/download`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setMessage('שגיאה בהורדת הקובץ');
    }
  };

  const handleFileDelete = async (fileId: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/files/${fileId}`);
      setMessage('הקובץ נמחק בהצלחה');
      loadFiles();
    } catch (error: any) {
      setMessage('שגיאה במחיקת הקובץ');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user) {
    return (
      <div className="app">
        <div className="auth-container">
          <h1>🗂️ אחסון קבצים</h1>
          
          <div className="auth-tabs">
            <button 
              className={showLogin ? 'tab active' : 'tab'} 
              onClick={() => setShowLogin(true)}
            >
              התחברות
            </button>
            <button 
              className={!showLogin ? 'tab active' : 'tab'} 
              onClick={() => setShowLogin(false)}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={showLogin ? handleLogin : handleRegister}>
            <div className="form-group">
              <label>שם משתמש:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {!showLogin && (
              <div className="form-group">
                <label>אימייל:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="form-group">
              <label>סיסמה:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" disabled={isLoading} className="submit-btn">
              {isLoading ? 'טוען...' : (showLogin ? 'התחבר' : 'הירשם')}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('שגיאה') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🗂️ אחסון קבצים</h1>
        <div className="user-info">
          <span>שלום, {user.username}!</span>
          <button onClick={handleLogout} className="logout-btn">התנתק</button>
        </div>
      </header>

      <main className="main">
        <div className="upload-section">
          <h2>העלאת קובץ חדש</h2>
          <p className="hebrew-support-note">✨ תמיכה מלאה בשמות קבצים בעברית!</p>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="file-input"
          />
          {isLoading && <div className="loading">מעלה קובץ...</div>}
        </div>

        {message && (
          <div className={`message ${message.includes('שגיאה') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="files-section">
          <h2>הקבצים שלי ({files.length})</h2>
          
          {files.length === 0 ? (
            <p>עדיין לא העלית קבצים</p>
          ) : (
            <div className="files-grid">
              {files.map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-info">
                    <h3>{file.originalName}</h3>
                    <p>גודל: {formatFileSize(file.size)}</p>
                    <p>סוג: {file.mimeType}</p>
                    <p>הועלה: {new Date(file.uploadedAt).toLocaleDateString('he-IL')}</p>
                  </div>
                  <div className="file-actions">
                    <button 
                      onClick={() => handleFileDownload(file.id, file.originalName)}
                      className="download-btn"
                    >
                      הורד
                    </button>
                    <button 
                      onClick={() => handleFileDelete(file.id)}
                      className="delete-btn"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;