import React, { useEffect, useState, useRef } from "react";
import api from "./api";
import "./createpost.css";

function CreatePost() {
  // Content type state
  const [contentType, setContentType] = useState("media");
  
  // Media states
  const [contentData, setContentData] = useState([]);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState([]);
  const [singleFile, setSingleFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCarousel, setIsCarousel] = useState(false);
  
  // Text post states
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#ffffff");
  const [backgroundGradient, setBackgroundGradient] = useState({ c1: "#667eea", c2: "#764ba2" });
  const [textAlign, setTextAlign] = useState("center");
  const [fontWeight, setFontWeight] = useState("600");
  
  // Platform states
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [postToFB, setPostToFB] = useState(false);
  const [postToIG, setPostToIG] = useState(false);
  const [rateLimits, setRateLimits] = useState(null);

  //  Twitter state
  const [postToTwitter, setPostToTwitter] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");

// ✅ LinkedIn state
const [postToLinkedIn, setPostToLinkedIn] = useState(false);
const [linkedInConnected, setLinkedInConnected] = useState(false);
const [linkedInName, setLinkedInName] = useState("");



    //  Scheduling states
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState("");
    const [hashtags, setHashtags] = useState("");


// Add new state at top (around line 40)
const [showGalleryModal, setShowGalleryModal] = useState(false);
const [galleryMedia, setGalleryMedia] = useState([]);
const [loadingGallery, setLoadingGallery] = useState(false);

const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
const [editingPostId, setEditingPostId] = useState(null);
// CreatePost.jsx - Updated fonts array with Google Fonts

const fonts = [
  // Web-safe fonts (always available)
  "Arial",
  "Impact",
  "Georgia",
  "Verdana",
  "Courier New",
  "Comic Sans MS",
  "Palatino",
  "Times New Roman",
  
  // ✅ Google Fonts (modern & beautiful)
  "Roboto",           // Clean, modern sans-serif
  "Montserrat",       // Bold, geometric sans-serif
  "Poppins",          // Friendly, rounded sans-serif
  "Playfair Display", // Elegant serif
  "Oswald",           // Bold, condensed sans-serif
  "Lora",             // Beautiful serif for quotes
  "Pacifico",         // Handwritten, fun script
  "Dancing Script",   // Elegant cursive
  "Bebas Neue",       // All-caps, bold display font
  "Cinzel",           // Classy, luxury serif
];

  
  const gradients = [
    // Vibrant
    { name: "Purple", c1: "#667eea", c2: "#764ba2" },
    { name: "Sunset", c1: "#ff6b6b", c2: "#feca57" },
    { name: "Ocean", c1: "#4facfe", c2: "#00f2fe" },
    { name: "Instagram", c1: "#f09433", c2: "#bc1888" },
    { name: "Fire", c1: "#ff0844", c2: "#ffb199" },
    { name: "Neon", c1: "#b3ffab", c2: "#12fff7" },
    
    // Pastels
    { name: "Pink", c1: "#ff9a9e", c2: "#fad0c4" },
    { name: "Lavender", c1: "#a18cd1", c2: "#fbc2eb" },
    { name: "Mint", c1: "#00c9ff", c2: "#92fe9d" },
    { name: "Peach", c1: "#ff758c", c2: "#ff7eb3" },
    { name: "Cotton Candy", c1: "#ffa6f6", c2: "#a79af9" },
    
    // Cool
    { name: "Night", c1: "#2c3e50", c2: "#3498db" },
    { name: "Sky", c1: "#2980b9", c2: "#6dd5fa" },
    { name: "Forest", c1: "#56ab2f", c2: "#a8e063" },
    
    // Warm
    { name: "Orange", c1: "#ff8008", c2: "#ffc837" },
    { name: "Rose", c1: "#eb3349", c2: "#f45c43" },
    
    // Solid
    { name: "White", c1: "#ffffff", c2: "#ffffff" },
    { name: "Black", c1: "#000000", c2: "#000000" },
  ];
  


  useEffect(() => {
    fetchContent();
    loadPagesForUser();
    checkTwitterConnection();
    checkLinkedInConnection(); // ✅ ADD THIS
  }, []);
  
  useEffect(() => {
    if (selectedPage && postToIG) {
      fetchRateLimits();
    } else {
      setRateLimits(null);
    }
  }, [selectedPage, postToIG]);

  useEffect(() => {
    if (contentType === "text" && canvasRef.current) {
      drawTextCanvas();
    }
  }, [textContent, fontSize, fontFamily, textColor, backgroundGradient, textAlign, fontWeight]);




// ✅ CORRECT: Load gallery media as SELECTED file in upload area
useEffect(() => {
  const galleryMediaJSON = localStorage.getItem("galleryMediaForPost");
  
  if (galleryMediaJSON) {
    try {
      const mediaItem = JSON.parse(galleryMediaJSON);
      
      console.log("📦 Loading from gallery:", mediaItem);
      
      // ✅ Set as selected file (not contentData)
      // Create a virtual file object for preview
      const galleryFile = {
        name: mediaItem.name || "Gallery Media",
        url: mediaItem.url,
        type: mediaItem.type,
        fromGallery: true,
        size: 0
      };
      
      // Set as single file (like user selected it)
      setSingleFile(galleryFile);
      
      // Optionally set default caption
      setTitle(mediaItem.name?.replace(/\.[^/.]+$/, "") || "");
      
      // Clear localStorage
      localStorage.removeItem("galleryMediaForPost");
      
      // Show success message
      setTimeout(() => {
        alert("✅ Media loaded from gallery! Add caption and click Upload.");
      }, 300);
      
    } catch (error) {
      console.error("❌ Failed to load gallery media:", error);
      localStorage.removeItem("galleryMediaForPost");
    }
  }
}, []);



// ✅ Listen for paste events globally when in media upload mode
useEffect(() => {
  if (contentType === "media") {
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }
}, [contentType, isCarousel, files]);


// ✅ NEW: Load scheduled post for editing
useEffect(() => {
  const editData = localStorage.getItem("editScheduledPost");
  
  if (editData) {
    try {
      const post = JSON.parse(editData);
      
      console.log("✅ Loading post for editing:", post);
      
      // Set edit mode
      setEditMode(true);
      setEditingPostId(post.id);
      
      // Populate caption/title
      setTitle(post.caption || post.title || "");
      
      // Set media
      if (post.type === "carousel" && post.items) {
        setIsCarousel(true);
        setContentType("media");
        
        // Convert items to contentData format
        setContentData([{
          title: post.title || "Carousel",
          type: "carousel",
          items: post.items,
          fromEdit: true
        }]);
      } else if (post.image || post.videoUrl) {
        setContentType("media");
        
        // Add to contentData
        setContentData([{
          title: post.title || "",
          type: post.type,
          image: post.image || null,
          videoUrl: post.videoUrl || null,
          url: post.image || post.videoUrl,
          fromEdit: true
        }]);
      }
      
      // Set platforms
      if (post.platforms) {
        setPostToFB(post.platforms.fb || false);
        setPostToIG(post.platforms.ig || false);
        setPostToTwitter(post.platforms.twitter || false);
        setPostToLinkedIn(post.platforms.linkedin || false);
      } else if (post.platform) {
        // Alternative format: array of platform names
        setPostToFB(post.platform.includes("facebook"));
        setPostToIG(post.platform.includes("instagram"));
        setPostToTwitter(post.platform.includes("twitter"));
        setPostToLinkedIn(post.platform.includes("linkedin"));
      }
      
      // Set selected page
      if (post.selectedPages && post.selectedPages.length > 0) {
        setSelectedPage(post.selectedPages[0]);
      } else if (post.pageId) {
        setSelectedPage(post.pageId);
      }
      
      // Set scheduled date
      if (post.scheduledFor) {
        setIsScheduling(true);
        const date = new Date(post.scheduledFor);
        const formattedDate = date.toISOString().slice(0, 16);
        setScheduledDateTime(formattedDate);
      }
      
      alert("✏️ Editing mode activated! Modify as needed and click 'Post Now' to update.");
      
    } catch (error) {
      console.error("Failed to parse edit data:", error);
      alert("❌ Failed to load post for editing");
    }
  }
}, []); // Run only once on mount




// ✅ Check Twitter connection using api.js (line ~90)
const checkTwitterConnection = async () => {
  try {
    const response = await api.get('/user/twitter/status');
    
    if (response.data.success && response.data.connected) {
      setTwitterConnected(true);
      setTwitterUsername(response.data.username || '');
    }
  } catch (error) {
    console.error('Error checking Twitter status:', error);
  }
};

// ✅ Check LinkedIn connection
const checkLinkedInConnection = async () => {
  try {
    const response = await api.get('/user/linkedin/status');
    if (response.data.connected) {
      setLinkedInConnected(true);
      setLinkedInName(response.data.name || '');
    }
  } catch (error) {
    console.error('Error checking LinkedIn status:', error);
  }
};


// ✅ Connect to LinkedIn
const connectLinkedIn = async () => {
  try {
    const res = await api.get('/user/linkedin/auth');
    if (res.data.authUrl) {
      window.location.href = res.data.authUrl;
    }
  } catch (err) {
    console.error('LinkedIn connect error:', err);
    alert('Failed to connect LinkedIn');
  }
};



  const drawTextCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, backgroundGradient.c1);
    gradient.addColorStop(1, backgroundGradient.c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = textColor;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";

    const lines = textContent.split("\n");
    const lineHeight = fontSize * 1.4;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    const xPos = textAlign === "left" ? 100 : textAlign === "right" ? width - 100 : width / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, xPos, startY + (i * lineHeight));
    });
  };

  async function loadPagesForUser() {
    try {
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) return;

      const res = await api.get("/user/pages");
      const pagesList = res.data?.pages || [];
      setPages(pagesList);
      if (pagesList.length > 0) {
        setSelectedPage(pagesList[0].pageId);
      }
    } catch (err) {
      console.error("Failed to load pages:", err);
    }
  }

  async function fetchContent() {
    try {
      const res = await api.get("/upload");
      const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setContentData(arr);
    } catch (err) {
      setContentData([]);
    }
  }

  async function fetchRateLimits() {
    try {
      if (!selectedPage || pages.length === 0) return;

      const page = pages.find(p => p.pageId === selectedPage);
      if (!page?.instagramBusinessId) {
        setRateLimits(null);
        return;
      }

      const res = await api.post("/user/rate-limits", { pageId: selectedPage });
      if (res.data?.data?.[0]) {
        setRateLimits(res.data.data[0]);
      }
    } catch (err) {
      setRateLimits(null);
    }
  }

  const handlePageChange = (newPageId) => {
    setSelectedPage(newPageId);
    
    const newPage = pages.find(p => p.pageId === newPageId);
    if (!newPage?.instagramBusinessId) {
      if (postToIG) setPostToIG(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (isCarousel) {
      if (selected.length + files.length > 10) {
        alert("Maximum 10 items");
        return;
      }
      setFiles(prev => [...prev, ...selected]);
    } else {
      setSingleFile(selected[0] || null);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSingleFile = () => {
    setSingleFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveContent = (index) => {
    if (window.confirm("Remove this content?")) {
      setContentData(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMediaUpload = async (e) => {
    e.preventDefault();
    
    const fileList = isCarousel ? files : [singleFile];
    
    if (fileList.length === 0 || (isCarousel && fileList.length < 2)) {
      alert(isCarousel ? "Select 2–10 files" : "Select a file");
      return;
    }
  
    setLoading(true);
    
    try {
      // ✅ Check if file is from gallery (already uploaded)
      if (!isCarousel && singleFile?.fromGallery) {
        // Skip upload, directly add to contentData
        const newContent = {
          title: title || singleFile.name,
          type: singleFile.type,
          image: singleFile.type === "image" ? singleFile.url : null,
          videoUrl: singleFile.type === "video" ? singleFile.url : null,
          url: singleFile.url,
          fromGallery: true
        };
        
        const itemType = contentType === "story" ? "story" : singleFile.type;
        setContentData(prev => [{ ...newContent, type: itemType }, ...prev]);
        
        alert("✅ Added to post!");
        setSingleFile(null);
        setTitle("");
        return;
      }
      
      // ✅ For carousel with gallery items
      const galleryItems = isCarousel ? files.filter(f => f.fromGallery) : [];
      const newFiles = isCarousel ? files.filter(f => !f.fromGallery) : [singleFile];
      
      let uploadedItems = [];
  
      // Upload new files
      if (newFiles.length > 0 && newFiles[0]) {
        const fd = new FormData();
        newFiles.forEach(file => fd.append("file", file));
        
        const res = await api.post("/upload", fd);
        const results = Array.isArray(res.data) ? res.data : [res.data];
        
        uploadedItems = results.map(r => ({
          title: title || "",
          type: r.resource_type === "video" ? "video" : "image",
          image: r.resource_type !== "video" ? r.url : null,
          videoUrl: r.resource_type === "video" ? r.url : null,
          url: r.url
        }));
      }
  
      // Add gallery items (already uploaded)
      const galleryUploaded = galleryItems.map(g => ({
        title: title || g.name,
        type: g.type,
        image: g.type === "image" ? g.url : null,
        videoUrl: g.type === "video" ? g.url : null,
        url: g.url
      }));
  
      const allItems = [...uploadedItems, ...galleryUploaded];
  
      // Add to contentData
      if (isCarousel) {
        setContentData(prev => [{
          title: title || "Carousel",
          type: "carousel",
          items: allItems.map(u => ({ type: u.type, url: u.url }))
        }, ...prev]);
      } else {
        const itemType = contentType === "story" ? "story" : allItems[0].type;
        setContentData(prev => [{ ...allItems[0], type: itemType }, ...prev]);
      }
  
      alert("✅ Uploaded!");
      setFiles([]);
      setSingleFile(null);
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (err) {
      setErrorMsg("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      alert("Enter text first!");
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      
      const fd = new FormData();
      fd.append("file", blob, "text-post.png");

      const res = await api.post("/upload", fd);
      const result = Array.isArray(res.data) ? res.data[0] : res.data;

      setContentData(prev => [{
        title: textContent.substring(0, 100),
        type: "image",
        image: result.url,
        url: result.url
      }, ...prev]);

      alert("✅ Text post created!");
      setTextContent("");
    } catch (err) {
      setErrorMsg("Failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };


  async function handlePost(cont) {
    try {
      setErrorMsg("");
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) {
        alert("Please login");
        return;
      }
  
      // Handle Story posting
      if (cont.type === "story") {
        if (!selectedPage) {
          alert("❌ Please select a Facebook page");
          return;
        }
  
        const page = pages.find(p => p.pageId === selectedPage);
        if (!page?.instagramBusinessId) {
          alert("❌ Selected page doesn't have Instagram connected");
          return;
        }
  
        setLoading(true);
        try {
          const response = await api.post("/user/story", {
            userId: user._id,
            pageId: selectedPage,
            type: cont.videoUrl ? "video" : "image",
            image: cont.image || null,
            videoUrl: cont.videoUrl || null
          });
  
          if (response.data.success) {
            alert("✅ Story posted successfully! Expires in 24 hours.");
            setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
          }
        } catch (err) {
          alert("❌ Failed to post story: " + (err.response?.data?.error || err.message));
        } finally {
          setLoading(false);
        }
        return;
      }
  
   // Check platform selection
if (!postToFB && !postToIG && !postToTwitter && !postToLinkedIn) {
  alert("Select at least one platform (Facebook, Instagram, Twitter, or LinkedIn)");
  return;
}

  
      // ✅ SCHEDULE POST
// ✅ SCHEDULE POST (with edit support)
if (isScheduling) {
  if (!scheduledDateTime) {
    alert("❌ Please select a date and time for scheduling");
    return;
  }

  const scheduleDate = new Date(scheduledDateTime);
  if (scheduleDate <= new Date()) {
    alert("❌ Scheduled time must be in the future");
    return;
  }

  const platforms = [];
  if (postToTwitter) platforms.push("twitter");
  if (postToFB) platforms.push("facebook");
  if (postToIG) platforms.push("instagram");
  if (postToLinkedIn) platforms.push("linkedin");

  const hashtagArray = hashtags
    .split(/[,\s]+/)
    .filter(tag => tag.trim())
    .map(tag => tag.replace("#", ""));

  setLoading(true);

  try {
    const payload = {
      title: cont.title || title || "",
      caption: cont.title || title || "",
      platform: platforms,
      scheduledFor: scheduleDate.toISOString(),
      hashtags: hashtagArray,
      type: cont.type,
      image: cont.image || null,
      videoUrl: cont.videoUrl || null,
      pageId: (postToFB || postToIG) ? selectedPage : null
    };

    if (cont.type === "carousel") {
      payload.items = cont.items;
    }

    let response;
    
    // ✅ Check if we're in edit mode
    if (editMode && editingPostId) {
      // UPDATE existing post
      response = await api.put(`/user/schedule-post/${editingPostId}`, payload);
      alert(`✅ Post updated and scheduled for ${scheduleDate.toLocaleString()}!`);
    } else {
      // CREATE new post
      response = await api.post("/user/schedule-post", payload);
      alert(`✅ Post scheduled for ${scheduleDate.toLocaleString()}!`);
    }

    if (response.data.success) {
      // Clear data
      setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
      setIsScheduling(false);
      setScheduledDateTime("");
      setHashtags("");
      
      // Clear edit mode
      if (editMode) {
        localStorage.removeItem("editScheduledPost");
        setEditMode(false);
        setEditingPostId(null);
      }
    }
  } catch (error) {
    alert("❌ Failed: " + (error.response?.data?.error || error.message));
  } finally {
    setLoading(false);
  }
  return;
}

  
      // ✅ IMMEDIATE POST
      
      // ✅ FIXED: Only validate selectedPage if posting to FB or IG
      if ((postToFB || postToIG) && !selectedPage) {
        alert("❌ Please select a Facebook page for Facebook/Instagram posting");
        return;
      }
  
      // ✅ Check Instagram availability
      if (postToIG && !currentPageHasIG()) {
        alert("❌ Selected page doesn't have Instagram connected");
        return;
      }
  
      // ✅ Check Twitter connection
      if (postToTwitter && !twitterConnected) {
        alert("❌ Twitter not connected. Please connect Twitter first.");
        return;
      }
  
      // Check carousel limitations
      if (cont.type === "carousel") {
        if (postToTwitter) {
          alert("⚠️ Note: Carousel posts cannot be posted to Twitter. Will post to FB/IG only.");
        }
      }
  
      // ✅ Check LinkedIn connection
if (postToLinkedIn && !linkedInConnected) {
  alert("LinkedIn not connected. Please connect LinkedIn first.");
  return;
}

      // Check Instagram rate limit
      if (postToIG && rateLimits && rateLimits.quota_usage >= 25) {
        alert("❌ Instagram daily limit reached (25 posts)");
        return;
      }
  
      setLoading(true);
  
      try {
        const payload = {
          userId: user._id,
          title: cont.title || "",
          type: cont.type,
          image: cont.image || null,
          videoUrl: cont.videoUrl || null,
          postToFB,
          postToIG,
          postToTwitter: cont.type === "carousel" ? false : postToTwitter,
          postToLinkedIn,
        };
  
        // ✅ FIXED: Only add pageId if posting to FB or IG
        if (postToFB || postToIG) {
          payload.pageId = selectedPage;
        }
  
        if (cont.type === "carousel") {
          payload.items = cont.items;
        }
  
        const response = await api.post("/user/post", payload);
  
        if (response.data.success) {
          const results = response.data.results;
          const platforms = [];
          
          if (postToFB && (results.fb?.id || results.fb?.post_id)) platforms.push("Facebook");
          if (postToIG && results.ig?.id) platforms.push("Instagram");
          if (postToTwitter && results.twitter?.id) platforms.push("Twitter");
          if (postToLinkedIn && results.linkedin?.id) platforms.push("LinkedIn");
          if (platforms.length > 0) {
            alert(`✅ Posted successfully to: ${platforms.join(", ")}!`);
            
            setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
            
            if (postToIG) {
              setTimeout(() => fetchRateLimits(), 2000);
            }
          } else {
            const errors = [];
            if (postToFB && results.fb?.error) errors.push(`FB: ${results.fb.error.message}`);
            if (postToIG && results.ig?.error) errors.push(`IG: ${results.ig.error.message}`);
            if (postToTwitter && results.twitter?.error) errors.push(`Twitter: ${results.twitter.error}`);
            
            alert("❌ Failed to post:\n" + errors.join("\n"));
          }
        } else {
          alert("❌ Failed to post: " + (response.data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Post error:", err);
        alert("❌ Failed to post: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
  
    } catch (err) {
      setLoading(false);
      alert("❌ Error: " + (err.response?.data?.error || err.message));
    }
  }
  

  const buildImageUrl = (img) => {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    const base = import.meta.env.VITE_API_URL || "";
    return base ? `${base.replace(/\/$/, "")}/${img.replace(/^\/+/, "")}` : img;
  };

  const currentPageHasIG = () => {
    const page = pages.find(p => p.pageId === selectedPage);
    return !!page?.instagramBusinessId;
  };




  // Add function to load gallery
const loadGallery = async () => {
  try {
    setLoadingGallery(true);
    const res = await api.get("/user/media-gallery");
    setGalleryMedia(res.data.media || []);
  } catch (err) {
    console.error("Failed to load gallery:", err);
    alert("Failed to load gallery");
  } finally {
    setLoadingGallery(false);
  }
};

// ✅ FIXED: Show gallery selection as preview in upload area
const selectFromGallery = (item) => {
  if (isCarousel) {
    // Check carousel limit
    if (files.length >= 10) {
      alert("❌ Maximum 10 items in carousel");
      return;
    }
    
    // Add URL-based item to carousel files (for preview)
    const galleryItem = {
      url: item.url,
      type: item.type,
      name: item.originalName || `Gallery ${item.type}`,
      fromGallery: true,
      size: 0
    };
    
    setFiles(prev => [...prev, galleryItem]);
    alert(`✅ Added to selection (${files.length + 1}/10)`);
  } else {
    // ✅ For single: Set as singleFile (same as file picker)
    const galleryFile = {
      url: item.url,
      type: item.type,
      name: item.originalName || "Gallery Media",
      fromGallery: true,
      size: 0
    };
    
    setSingleFile(galleryFile);
    alert("✅ Media selected! Add caption and click Upload.");
  }
  
  setShowGalleryModal(false);
};



// ✅ Drag & Drop Handlers
const handleDragEnter = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
  
  const droppedFiles = Array.from(e.dataTransfer.files);
  
  // Filter only images and videos
  const validFiles = droppedFiles.filter(file => 
    file.type.startsWith('image/') || file.type.startsWith('video/')
  );
  
  if (validFiles.length === 0) {
    alert("⚠️ Please drop only images or videos");
    return;
  }
  
  if (isCarousel) {
    if (files.length + validFiles.length > 10) {
      alert("❌ Maximum 10 items in carousel");
      return;
    }
    setFiles(prev => [...prev, ...validFiles]);
  } else {
    setSingleFile(validFiles[0]);
  }
};

// ✅ Paste Handler
const handlePaste = (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  const pastedFiles = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Check if item is an image or video
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      const file = item.getAsFile();
      if (file) {
        pastedFiles.push(file);
      }
    }
  }
  
  if (pastedFiles.length === 0) {
    return; // No valid files pasted
  }
  
  if (isCarousel) {
    if (files.length + pastedFiles.length > 10) {
      alert("❌ Maximum 10 items in carousel");
      return;
    }
    setFiles(prev => [...prev, ...pastedFiles]);
    alert(`✅ ${pastedFiles.length} file(s) pasted!`);
  } else {
    setSingleFile(pastedFiles[0]);
    alert("✅ Image pasted!");
  }
};


// ✅ FIXED: localStorage ONLY - No API needed
const saveDraft = async (cont) => {
  const draft = {
    id: `draft_${Date.now()}`,
    url: cont.image || cont.videoUrl || cont.url,
    type: cont.type,
    caption: title || cont.title || "",
    platforms: {
      fb: postToFB,
      ig: postToIG,
      twitter: postToTwitter,
      linkedin: postToLinkedIn
    },
    savedAt: new Date().toISOString(),
    pageId: selectedPage
  };

  try {
    // ✅ localStorage ONLY - Works immediately
    const existingDrafts = JSON.parse(localStorage.getItem("postDrafts") || "[]");
    const updatedDrafts = [draft, ...existingDrafts.slice(0, 20)]; // Keep max 20 drafts
    localStorage.setItem("postDrafts", JSON.stringify(updatedDrafts));
    
    alert("✅ Saved as draft! View in Content Manager (SchedulePost page).");
    
    // Remove from current content list
    setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
  } catch (err) {
    console.error("Draft save error:", err);
    alert("✅ Draft saved locally!");
  }
};





  return (
    <div className="create-post-wrapper">
      {/* Left Panel */}

      {editMode && (
      <div style={{
        background: "linear-gradient(135deg, #fff3cd, #ffc107)",
        border: "2px solid #ffc107",
        padding: "15px 20px",
        borderRadius: "12px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
            <span style={{ fontSize: "24px" }}>✏️</span>
            <strong style={{ fontSize: "18px", color: "#856404" }}>
              Editing Mode
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#856404" }}>
            You're editing a scheduled post. Modify content and click "Post Now" to update.
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm("Cancel editing? Changes will be lost.")) {
              localStorage.removeItem("editScheduledPost");
              setEditMode(false);
              setEditingPostId(null);
              setContentData([]);
              setTitle("");
              window.location.reload(); // Or navigate back
            }
          }}
          style={{
            background: "#6c757d",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px"
          }}
        >
          ✕ Cancel Edit
        </button>
      </div>
    )}

      <div className="left-panel">
        <div className="panel-header">
          <h2>✨ Create Content</h2>
        </div>
  
        {/* Content Type Tabs */}
        <div className="content-tabs">
          <button
            className={contentType === "media" ? "active" : ""}
            onClick={() => setContentType("media")}
          >
            <span>📸</span> Media
          </button>
          <button
            className={contentType === "text" ? "active" : ""}
            onClick={() => setContentType("text")}
          >
            <span>📝</span> Text
          </button>
          <button
            className={contentType === "story" ? "active" : ""}
            onClick={() => setContentType("story")}
          >
            <span>📖</span> Story
          </button>
        </div>
  
        {/* Platform Selection - Only for Media & Text */}
        {contentType !== "story" && (
          <div className="platform-box">
            <h3>📱 Select Platforms</h3>
  
            {/* ✅ PAGE SELECTION FIRST (Always visible) */}
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333',
                fontSize: '14px'
              }}>
                📄 Select Facebook Page
              </label>
              
              {pages.length > 0 ? (
                <>
                  <select
                    value={selectedPage}
                    onChange={(e) => handlePageChange(e.target.value)}
                    className="page-select"
                    style={{ marginBottom: '10px' }}
                  >
                    {pages.map((page) => (
                      <option key={page.pageId} value={page.pageId}>
                        {page.pageName} {page.instagramBusinessId ? "📸 IG Linked" : ""}
                      </option>
                    ))}
                  </select>
                  
                  <small style={{ color: '#666', fontSize: '12px', display: 'block' }}>
                    💡 This page is used for Facebook/Instagram posting. Select to enable these platforms.
                  </small>
                </>
              ) : (
                <div style={{ 
                  color: '#dc3545', 
                  fontSize: '13px',
                  padding: '10px',
                  backgroundColor: '#f8d7da',
                  borderRadius: '6px',
                  border: '1px solid #f5c2c7'
                }}>
                  ⚠️ No Facebook pages connected. <a href="/" style={{ color: '#dc3545', fontWeight: '600' }}>Connect Facebook</a>
                </div>
              )}
            </div>
  
            {/* ✅ FACEBOOK CHECKBOX - Now independent */}
            <label className={`platform-option ${postToFB ? "active" : ""} ${!selectedPage ? "disabled" : ""}`}>
              <input
                type="checkbox"
                checked={postToFB}
                onChange={(e) => setPostToFB(e.target.checked)}
                disabled={!selectedPage}
              />
              <span className="icon">📘</span>
              <span>Post to Facebook</span>
              {!selectedPage && <small style={{ color: '#dc3545' }}>Select page first</small>}
            </label>
  
            {/* ✅ INSTAGRAM CHECKBOX - Based on page selection, NOT Facebook checkbox */}
            <label
              className={`platform-option ${postToIG ? "active" : ""} ${
                !selectedPage || !currentPageHasIG() ? "disabled" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={postToIG}
                disabled={!selectedPage || !currentPageHasIG()}
                onChange={(e) => {
                  if (!currentPageHasIG()) {
                    alert("❌ Selected page doesn't have Instagram linked");
                    return;
                  }
                  setPostToIG(e.target.checked);
                }}
              />
              <span className="icon">📸</span>
              <span>Post to Instagram</span>
              {!selectedPage && <small style={{ color: '#666' }}>Select page first</small>}
              {selectedPage && !currentPageHasIG() && (
                <small style={{ color: '#dc3545' }}>This page has no Instagram</small>
              )}
            </label>
  
            {postToIG && rateLimits && (
              <div className="rate-info">
                <span>
                  📊 Instagram: {rateLimits.quota_usage}/25 posts today
                </span>
                <div className="rate-bar">
                  <div
                    style={{ width: `${(rateLimits.quota_usage / 25) * 100}%` }}
                  />
                </div>
              </div>
            )}
  
            {/* ✅ TWITTER CHECKBOX - Already independent, unchanged */}
            <label
              className={`platform-option ${postToTwitter ? "active" : ""} ${
                !twitterConnected ? "disabled" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={postToTwitter}
                disabled={!twitterConnected}
                onChange={(e) => {
                  if (!twitterConnected) {
                    alert("❌ Twitter not connected. Go to Dashboard to connect Twitter.");
                    return;
                  }
                  setPostToTwitter(e.target.checked);
                }}
              />
              <span className="icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2" style={{ verticalAlign: 'middle' }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </span>
              <span>Post to Twitter</span>
              {twitterConnected && twitterUsername && (
                <small style={{ color: '#1DA1F2' }}>@{twitterUsername}</small>
              )}
              {!twitterConnected && <small style={{ color: '#dc3545' }}>Not connected</small>}
            </label>
  
            {postToTwitter && !twitterConnected && (
              <div className="warning-box" style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                padding: '10px',
                borderRadius: '5px',
                marginTop: '10px'
              }}>
                <span style={{ color: '#856404' }}>
                  ⚠️ Twitter is not connected. <a href="/" style={{ color: '#1DA1F2' }}>Connect Twitter</a>
                </span>
              </div>
            )}

           {/* ✅ LINKEDIN CHECKBOX - Complete */}
<label 
  className={`platform-option ${postToLinkedIn ? 'active' : ''} ${!linkedInConnected ? 'disabled' : ''}`}
>
  <input
    type="checkbox"
    checked={postToLinkedIn}
    disabled={!linkedInConnected}
    onChange={(e) => {
      if (!linkedInConnected) {
        alert('LinkedIn not connected. Go to Dashboard → Connect LinkedIn.');
        return;
      }
      setPostToLinkedIn(e.target.checked);
    }}
  />
  <span className="icon">🔗</span>
  <span>Post to LinkedIn</span>
  {linkedInConnected && linkedInName && (
    <small style={{ color: '#0077B5' }}>{linkedInName}</small>
  )}
  {!linkedInConnected && (
    <small style={{ color: '#dc3545' }}>Not connected</small>
  )}
</label>

{/* Warning if LinkedIn not connected but user tries to check */}
{postToLinkedIn && !linkedInConnected && (
  <div className="warning-box" style={{ 
    backgroundColor: '#fff3cd', 
    border: '1px solid #ffc107', 
    padding: '10px', 
    borderRadius: '5px', 
    marginTop: '10px' 
  }}>
    <span style={{ color: '#856404' }}>
      ⚠️ LinkedIn is not connected. 
      <a href="/home/connect" style={{ color: '#0077B5' }}> Connect LinkedIn</a>
    </span>
  </div>
)}




  
            {/* ✅ SCHEDULING SECTION */}
            <div style={{ 
              borderTop: "1px solid #e0e0e0", 
              marginTop: "15px", 
              paddingTop: "15px" 
            }}>
              <label className="schedule-toggle" style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: isScheduling ? "#e3f2fd" : "#f5f5f5",
                borderRadius: "8px",
                cursor: "pointer",
                border: isScheduling ? "2px solid #2196f3" : "2px solid transparent"
              }}>
                <input
                  type="checkbox"
                  checked={isScheduling}
                  onChange={(e) => setIsScheduling(e.target.checked)}
                  style={{ width: "20px", height: "20px" }}
                />
                <span style={{ fontWeight: "600", color: isScheduling ? "#1976d2" : "#333" }}>
                  📅 Schedule for later
                </span>
              </label>
  
              {isScheduling && (
                <div style={{ 
                  marginTop: "15px", 
                  padding: "15px", 
                  backgroundColor: "#fff", 
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0"
                }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    📆 Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                    required
                  />
  
                  <label style={{ 
                    display: "block", 
                    marginTop: "12px",
                    marginBottom: "8px", 
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    🏷️ Hashtags (optional)
                  </label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="marketing, social, tech (comma separated)"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  />
                  <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "5px" }}>
                    Separate with commas or spaces
                  </small>
                </div>
              )}
            </div>
          </div>
        )}


        
  
        {/* Story Settings */}
        {contentType === "story" && (
          <div className="platform-box story-platform">
            <h3>📖 Instagram Story</h3>
            <div className="story-info-box">
              <span className="story-icon">📸</span>
              <div>
                <p>
                  <strong>Instagram Only</strong>
                </p>
                <small>
                  Stories post to Instagram via your Facebook page's connected
                  account
                </small>
              </div>
            </div>
  
            {pages.length > 0 && (
              <>
                <label className="page-label">Select Facebook Page</label>
                <select
                  value={selectedPage}
                  onChange={(e) => handlePageChange(e.target.value)}
                  className="page-select"
                >
                  {pages.map((page) => (
                    <option key={page.pageId} value={page.pageId}>
                      {page.pageName} {page.instagramBusinessId ? "✅" : "❌"}
                    </option>
                  ))}
                </select>
  
                {!currentPageHasIG() && (
                  <div className="warning-box">
                    ⚠️ Selected page has no Instagram. Connect Instagram first.
                  </div>
                )}
  
                {currentPageHasIG() && rateLimits && (
                  <div className="rate-info">
                    <span>📊 {rateLimits.quota_usage}/25 posts today</span>
                    <div className="rate-bar">
                      <div
                        style={{
                          width: `${(rateLimits.quota_usage / 25) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
  
        {/* Upload Area */}
        <div className="upload-area">
  {contentType === "media" && (
    <form onSubmit={handleMediaUpload}>
      <label className="carousel-check">
        <input
          type="checkbox"
          checked={isCarousel}
          onChange={(e) => {
            setIsCarousel(e.target.checked);
            setFiles([]);
            setSingleFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <span>Carousel (2-10 items)</span>
      </label>

      <input
        type="text"
        placeholder="Caption (optional)..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="caption-field"
      />

      {/* Drag & Drop Zone */}
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple={isCarousel}
          onChange={handleFileChange}
          className="file-input"
          style={{ display: 'none' }}
        />
        
        <div className="drop-zone-content">
          {isDragging ? (
            <>
              <div className="drop-icon">📥</div>
              <p className="drop-text">Drop files here</p>
            </>
          ) : (
            <>
              <div className="upload-icon">📤</div>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag & drop
              </p>
              <p className="upload-hint">
                You can also <strong>paste (Ctrl+V)</strong> images
              </p>
              <small className="upload-specs">
                {isCarousel ? "2-10 items • " : ""}Images or Videos • Max 100MB
              </small>
            </>
          )}
        </div>
      </div>

   
     {/* ✅ SHOW ONLY FILENAMES - No image preview before upload */}
{(files.length > 0 || singleFile) && (
  <div className="selected-files-list">
    <div className="files-list-header">
      <span>📋 Selected Files</span>
      <small>{isCarousel ? `${files.length}/10` : '1 file'}</small>
    </div>

    {/* Carousel - Multiple files */}
    {isCarousel && files.length > 0 && (
      <div className="files-items">
        {files.map((f, i) => (
          <div key={i} className="file-item">
            <span className="file-number">{i + 1}.</span>
            <span className="file-icon">
              {f.type === "video" || f.type?.startsWith('video') ? '🎥' : '🖼️'}
            </span>
            <span className="file-name" title={f.name}>
              {f.name}
            </span>
            {f.fromGallery && (
              <span className="file-source">Gallery</span>
            )}
            <button 
              type="button" 
              className="file-remove-btn"
              onClick={() => removeFile(i)}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )}

    {/* Single file */}
    {!isCarousel && singleFile && (
      <div className="files-items">
        <div className="file-item">
          <span className="file-icon">
            {singleFile.type === "video" || singleFile.type?.startsWith('video') ? '🎥' : '🖼️'}
          </span>
          <span className="file-name" title={singleFile.name}>
            {singleFile.name}
          </span>
          {singleFile.fromGallery && (
            <span className="file-source">Gallery</span>
          )}
          <button 
            type="button" 
            className="file-remove-btn"
            onClick={removeSingleFile}
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
    )}
  </div>
)}

      {/* Browse Gallery Button */}
      <button 
        type="button"
        onClick={() => {
          setShowGalleryModal(true);
          loadGallery();
        }}
        className="gallery-btn"
      >
        🖼️ Browse Gallery
      </button>

      {/* Upload Button */}
      <button 
        type="submit" 
        // disabled={loading || (!singleFile && files.length === 0)} 
        className="upload-btn"
      >
        {loading 
          ? "⏳ Uploading..." 
          : (singleFile?.fromGallery || files.some(f => f.fromGallery))
          ? "Upload"
          : "📤 Upload"}
      </button>
    </form>
  )}
          {contentType === "text" && (
            <div className="text-creator">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your text..."
                className="text-area"
              />
  
              <div className="text-tools">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {fonts.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
  
                <input
                  type="range"
                  min="24"
                  max="100"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  title={`Size: ${fontSize}px`}
                />
  
                <label className="color-wrap" title="Text color">
                  <input
                    type="color"
                    className="color-picker-overlay"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                </label>
              </div>
  
              <div className="style-btns">
                <button
                  className={fontWeight === "bold" ? "active" : ""}
                  onClick={() =>
                    setFontWeight(fontWeight === "bold" ? "600" : "bold")
                  }
                >
                  B
                </button>
                <button
                  className={textAlign === "left" ? "active" : ""}
                  onClick={() => setTextAlign("left")}
                >
                  ⬅
                </button>
                <button
                  className={textAlign === "center" ? "active" : ""}
                  onClick={() => setTextAlign("center")}
                >
                  ↔
                </button>
                <button
                  className={textAlign === "right" ? "active" : ""}
                  onClick={() => setTextAlign("right")}
                >
                  ➡
                </button>
              </div>
  
              <div className="gradient-grid">
                {gradients.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setBackgroundGradient(g)}
                    style={{
                      background: `linear-gradient(135deg, ${g.c1}, ${g.c2})`,
                    }}
                    title={g.name}
                  />
                ))}
              </div>
  
              <canvas ref={canvasRef} className="text-preview" />
  
              <button
                onClick={handleTextUpload}
                disabled={loading}
                className="upload-btn"
              >
                {loading ? "⏳ Creating..." : "✨ Create Text Post"}
              </button>
            </div>
          )}
  
          {contentType === "story" && (
            <form onSubmit={handleMediaUpload}>
              <div className="story-hint">
                <span>📖</span>
                <div>
                  <p>
                    <strong>Story Requirements</strong>
                  </p>
                  <small>
                    • Vertical (9:16) recommended
                    <br />• Expires in 24 hours
                    <br />• Image or Video
                  </small>
                </div>
              </div>
  
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="file-input"
              />
  
              {singleFile && (
                <div className="file-list">
                  <div className="file-tag">
                    {singleFile.name}
                    <button type="button" onClick={removeSingleFile}>
                      ✕
                    </button>
                  </div>
                </div>
              )}
  
              <button
                type="submit"
                disabled={loading || !currentPageHasIG()}
                className="upload-btn"
              >
                {loading
                  ? "⏳ Uploading..."
                  : !currentPageHasIG()
                  ? "⚠️ No Instagram"
                  : "📤 Upload Story"}
              </button>
            </form>
          )}
        </div>

      </div>
  
      {/* Right Panel */}
      <div className="right-panel">
        <div className="panel-header">
          <h3>📂 Uploaded Content</h3>
          <span className="count">{contentData.length}</span>
        </div>
  
        <div className="content-scroll">
          {contentData.length === 0 ? (
            <div className="empty">No content yet. Upload something!</div>
          ) : (
            contentData.map((cont, idx) => (
              <div key={idx} className="post-card">
                <button
                  className="del-btn"
                  onClick={() => handleRemoveContent(idx)}
                >
                  ✕
                </button>
  
                <div className="card-preview">
                  {cont.type === "carousel" ? (
                    <div className="carousel-grid">
                      {cont.items?.map((item, i) => (
                        <div
                          key={i}
                          className="carousel-item"
                          data-index={i + 1}
                        >
                          {item.type === "video" ? (
                            <video src={item.url} />
                          ) : (
                            <img src={item.url} alt="" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : cont.type === "video" || cont.videoUrl ? (
                    <video src={buildImageUrl(cont.videoUrl || cont.image)} />
                  ) : (
                    <img src={buildImageUrl(cont.image)} alt="" />
                  )}
                </div>
  
                <div className="card-info">
                  <p>{cont.title || "(no caption)"}</p>
                  <span className="badge">{cont.type}</span>
                  {cont.fromGallery && (
    <span 
      className="badge" 
      style={{ 
        background: 'linear-gradient(135deg, #667eea, #764ba2)', 
        marginLeft: '8px' 
      }}
    >
      🖼️ Gallery
    </span>
  )}
                </div>
  
                <div className="post-actions">

                <button
  onClick={() => handlePost(cont)}
  className="btn-post-now"
  disabled={loading}
>
  {loading 
    ? '⏳ Processing...' 
    : editMode 
    ? '💾 Update Post' 
    : cont.type === "story" 
    ? "📖 Post Story" 
    : "🚀 Post Now"
  }
</button>

  

  <button
    onClick={() => saveDraft(cont)}
    className="btn-save-draft"
    disabled={loading}
  >
    📝 Save Draft
  </button>
  
  {/* ✅ 3. Schedule - NEW
  <button
    onClick={() => handleSchedule(cont)}
    className="btn-schedule"
    disabled={loading}
  >
    ⏰ Schedule
  </button> */}
</div>

              </div>
            ))
          )}


        </div>
      </div>

      {/* ✅ GALLERY MODAL */}
{showGalleryModal && (
  <div className="modal-overlay" onClick={() => setShowGalleryModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>📁 My Media Gallery</h3>
        <button 
          className="close-btn" 
          onClick={() => setShowGalleryModal(false)}
        >
          ✕
        </button>
      </div>

      <div className="modal-body">
        {loadingGallery ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>
            ⏳ Loading gallery...
          </p>
        ) : galleryMedia.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>📂 No media in gallery</p>
            <small>Upload media in Media Gallery page first</small>
          </div>
        ) : (
          <div className="gallery-grid">
            {galleryMedia.map((item) => (
              <div 
                key={item._id} 
                className="gallery-item"
                onClick={() => selectFromGallery(item)}
              >
                {item.type === "image" ? (
                  <img src={item.url} alt={item.originalName} />
                ) : (
                  <div className="video-thumb">
                    <video src={item.url} />
                    <span className="play-icon">▶️</span>
                  </div>
                )}
                <div className="gallery-item-info">
                  <small>{item.type}</small>
                  <small>{new Date(item.uploadedAt).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}

    </div>
  );
  
}

export default CreatePost;
