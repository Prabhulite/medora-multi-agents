import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DoctorApp from './App';
import '../../frontend/src/styles/theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><DoctorApp /></StrictMode>);
