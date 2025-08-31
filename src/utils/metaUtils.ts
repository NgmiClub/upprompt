interface MetaTagsConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  site_name?: string;
  twitter_site?: string;
  theme_color?: string;
}

export class MetaTagsManager {
  private static instance: MetaTagsManager;
  private ogImageCache = new Map<string, string>();

  static getInstance(): MetaTagsManager {
    if (!MetaTagsManager.instance) {
      MetaTagsManager.instance = new MetaTagsManager();
    }
    return MetaTagsManager.instance;
  }

  updateMetaTags(config: MetaTagsConfig) {
    // Update document title
    document.title = config.title;

    // Update or create meta tags
    this.updateMetaTag('description', config.description);
    
    // OpenGraph tags
    this.updateMetaTag('og:title', config.title);
    this.updateMetaTag('og:description', config.description);
    this.updateMetaTag('og:type', config.type || 'article');
    this.updateMetaTag('og:site_name', config.site_name || 'Upprompt');
    
    if (config.image) {
      this.updateMetaTag('og:image', config.image);
      this.updateMetaTag('og:image:type', 'image/png');
      this.updateMetaTag('og:image:width', '1200');
      this.updateMetaTag('og:image:height', '630');
    }
    
    if (config.url) {
      this.updateMetaTag('og:url', config.url);
      this.updateLinkTag('canonical', config.url);
    }

    // Twitter Card tags
    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', config.title);
    this.updateMetaTag('twitter:description', config.description);
    this.updateMetaTag('twitter:site', config.twitter_site || '@Upprompt');
    
    if (config.image) {
      this.updateMetaTag('twitter:image', config.image);
    }

    // Theme color
    if (config.theme_color) {
      this.updateMetaTag('theme-color', config.theme_color);
    }
  }

  private updateMetaTag(property: string, content: string) {
    const isOgOrTwitter = property.startsWith('og:') || property.startsWith('twitter:');
    const selector = isOgOrTwitter ? `meta[property="${property}"]` : `meta[name="${property}"]`;
    
    let element = document.querySelector(selector) as HTMLMetaElement;
    
    if (!element) {
      element = document.createElement('meta');
      if (isOgOrTwitter) {
        element.setAttribute('property', property);
      } else {
        element.setAttribute('name', property);
      }
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  }

  private updateLinkTag(rel: string, href: string) {
    let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
    
    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', rel);
      document.head.appendChild(element);
    }
    
    element.setAttribute('href', href);
  }

  async generatePromptOGImage(promptData: {
    title: string;
    content: string;
    author: string;
    tags: string[];
    upvotes: number;
    promptId: string;
  }): Promise<string> {
    const cacheKey = `prompt-${promptData.promptId}`;
    
    if (this.ogImageCache.has(cacheKey)) {
      return this.ogImageCache.get(cacheKey)!;
    }

    try {
      // Import the OG image generator dynamically
      const { OGImageGenerator } = await import('./ogImageGenerator');
      
      const generator = new OGImageGenerator();
      const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      
      const imageDataUrl = await generator.generateImage({
        title: promptData.title,
        content: promptData.content,
        author: promptData.author,
        tags: promptData.tags,
        upvotes: promptData.upvotes,
        theme
      });

      // Cache the generated image
      this.ogImageCache.set(cacheKey, imageDataUrl);
      
      return imageDataUrl;
    } catch (error) {
      console.error('Failed to generate OG image:', error);
      return '/og-image.png'; // Fallback to static image
    }
  }

  setPromptMetaTags(promptData: {
    title: string;
    content: string;
    author: string;
    tags: string[];
    upvotes: number;
    promptId: string;
  }) {
    const description = `${promptData.content.substring(0, 150)}${promptData.content.length > 150 ? '...' : ''} - Created by @${promptData.author} | ${promptData.upvotes} upvotes | Tags: ${promptData.tags.slice(0, 3).join(', ')}`;
    
    const config: MetaTagsConfig = {
      title: `${promptData.title} - Upprompt`,
      description,
      url: `${window.location.origin}/prompt/${promptData.promptId}`,
      type: 'article',
      theme_color: '#f59e0b'
    };

    // Generate and set the OG image
    this.generatePromptOGImage(promptData).then(imageUrl => {
      config.image = imageUrl;
      this.updateMetaTags(config);
    });

    // Set other meta tags immediately
    this.updateMetaTags(config);
  }

  resetToDefault() {
    const defaultConfig: MetaTagsConfig = {
      title: 'Upprompt - Discover & Share AI Prompts',
      description: 'A sophisticated platform for sharing, discovering, and collaborating on high-quality AI prompts. Join our community of AI enthusiasts and prompt engineers.',
      url: window.location.origin,
      type: 'website',
      image: '/og-image.png',
      theme_color: '#f59e0b' ,
    };

    this.updateMetaTags(defaultConfig);
  }
}

// Export singleton instance
export const metaTagsManager = MetaTagsManager.getInstance();