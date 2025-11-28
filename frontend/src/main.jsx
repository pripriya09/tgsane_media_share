import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// import Content from './Content.jsx'
// import App from './App.jsx'
// import Share from './Share.jsx'
// import AutoPostApp from './AutoPostApp.jsx'
import AppRoutes from './MEDIA_SHARE/AppRoutes';
// import TwoFactorSetup from './MEDIA_SHARE/TwoFactorSetup';




createRoot(document.getElementById('root')).render(
  <>

<AppRoutes/> 
{/* <TwoFactorSetup/> */}
  {/* <App/> */}
   {/* <Content/> */}
   {/* <AutoPostApp/> */}
   {/* <Share/> */}
  </>


)
