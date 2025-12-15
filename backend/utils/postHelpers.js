// utils/postHelpers.js - NEW FILE
export const extractHashtags = (text) => {
    if (!text) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex) || [];
    return matches.map(tag => tag.substring(1)); // Remove #
  };
  
  export const extractMentions = (text, platforms) => {
    if (!text) return [];
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex) || [];
    const platformArray = Array.isArray(platforms) ? platforms : [platforms];
    
    return matches.map(mention => ({
      username: mention.substring(1), // Remove @
      platform: platformArray[0]
    }));
  };
  
  export const formatPostContent = (caption, hashtags, platform) => {
    let formatted = caption || "";
    
    // Add hashtags if not already in caption
    if (hashtags && hashtags.length > 0) {
      const existing = extractHashtags(caption);
      const newTags = hashtags.filter(tag => !existing.includes(tag));
      
      if (newTags.length > 0) {
        formatted += "\n\n" + newTags.map(tag => `#${tag}`).join(" ");
      }
    }
    
    // Platform-specific limits
    if (platform === "twitter" && formatted.length > 280) {
      formatted = formatted.substring(0, 277) + "...";
    }
    
    return formatted;
  };
  