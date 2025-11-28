import React, {useState,useEffect } from 'react'
import axios from 'axios'

function Content() {
const [shareData,setShareData] = useState([]);

useEffect(() => {
     function fetchContentData() {
 
     axios.get("http://localhost:8000/show")
      .then((res)=>{
        console.log(res.data);
      setShareData(res.data);
      console.log("data show")
      })
      .catch((err)=>{
        console.log({err:"error"})
      })
      
    }
    fetchContentData();
  }, []);

  const handleShareData = (title, body) => {
    const facebookShare = 'https://www.facebook.com/tgsanetechnologies'
    window.open(facebookShare);

    // const InstagramShare ='http://www.instagram.com/tgsanetechnologies/'
    //  window.open(InstagramShare);
  };


  return (
    <>
    <div className="content">
      <h1>SHARE CONTENT</h1>
      <div className="Share-content">
        {shareData.map(content => (
          <div key={content.id} className="share">
            <h3>{content.title}</h3>
            <p>{content.body}</p>
            <button onClick={() => handleShareData(content.id,content.title, content.body)}>
              shareContent:fb/in
            </button>
          </div>
        ))}
      </div>
    </div>
  </>
  )
}

export default Content