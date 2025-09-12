export interface OGImageData {
  title: string;
  content: string;
  author: string;
  tags: string[];
  upvotes: number;
  theme: 'light' | 'dark';
}

export class OGImageGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly width = 1200;
  private readonly height = 630;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async generateImage(data: OGImageData): Promise<string> {
    const { title, content, author, tags, upvotes, theme } = data;

    // Theme colors
    const colors = theme === 'dark' ? {
      background: '#0a0a0a',
      card: '#1a1a1a',
      primary: '#f59e0b',
      text: '#ffffff',
      muted: '#a3a3a3',
      border: '#333333'
    } : {
      background: '#ffffff',
      card: '#f8fafc',
      primary: '#f59e0b',
      text: '#1e293b',
      muted: '#64748b',
      border: '#e2e8f0'
    };

    // Clear canvas
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Add gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, theme === 'dark' ? '#1a1a1a' : '#f8fafc');
    gradient.addColorStop(1, theme === 'dark' ? '#0a0a0a' : '#ffffff');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw main card
    this.drawRoundedRect(60, 60, this.width - 120, this.height - 120, 24, colors.card);
    
    // Draw border
    this.ctx.strokeStyle = colors.border;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw logo/brand
    this.ctx.fillStyle = colors.primary;
    this.ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    this.ctx.fillText('weprompt', 100, 120);

    // Draw title
    this.ctx.fillStyle = colors.text;
    this.ctx.font = 'bold 48px Inter, system-ui, sans-serif';
    const titleLines = this.wrapText(title, 48, 1000);
    titleLines.slice(0, 2).forEach((line, index) => {
      this.ctx.fillText(line, 100, 190 + (index * 60));
    });

    // Draw content preview
    this.ctx.fillStyle = colors.muted;
    this.ctx.font = '28px Inter, system-ui, sans-serif';
    const contentPreview = content.length > 120 ? content.substring(0, 120) + '...' : content;
    const contentLines = this.wrapText(contentPreview, 28, 1000);
    contentLines.slice(0, 3).forEach((line, index) => {
      this.ctx.fillText(line, 100, 340 + (index * 40));
    });

    // Draw author info
    this.ctx.fillStyle = colors.text;
    this.ctx.font = '24px Inter, system-ui, sans-serif';
    this.ctx.fillText(`by @${author}`, 100, 480);

    // Draw stats
    this.ctx.fillStyle = colors.primary;
    this.ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    this.ctx.fillText(`❤️ ${upvotes}`, 100, 520);

    // Draw tags
    if (tags.length > 0) {
      let xPos = 300;
      tags.slice(0, 3).forEach((tag, index) => {
        this.drawTag(tag, xPos, 500, colors);
        xPos += this.ctx.measureText(`#${tag}`).width + 40;
      });
    }

    // Draw accent elements
    this.drawAccentElements(colors);

    return this.canvas.toDataURL('image/png');
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, fillStyle: string) {
    this.ctx.fillStyle = fillStyle;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
  }

  private drawTag(tag: string, x: number, y: number, colors: any) {
    const text = `#${tag}`;
    this.ctx.font = '18px Inter, system-ui, sans-serif';
    const textWidth = this.ctx.measureText(text).width;
    
    // Draw tag background
    this.ctx.fillStyle = colors.primary + '20';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y - 20, textWidth + 20, 30, 15);
    this.ctx.fill();

    // Draw tag text
    this.ctx.fillStyle = colors.primary;
    this.ctx.fillText(text, x + 10, y);
  }

  private drawAccentElements(colors: any) {
    // Draw decorative circles
    this.ctx.fillStyle = colors.primary + '20';
    this.ctx.beginPath();
    this.ctx.arc(1050, 150, 60, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.fillStyle = colors.primary + '10';
    this.ctx.beginPath();
    this.ctx.arc(1100, 400, 40, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw pattern lines
    this.ctx.strokeStyle = colors.primary + '30';
    this.ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(950 + (i * 20), 300);
      this.ctx.lineTo(970 + (i * 20), 320);
      this.ctx.stroke();
    }
  }

  private wrapText(text: string, fontSize: number, maxWidth: number): string[] {
    this.ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  async generateImageBlob(data: OGImageData): Promise<Blob> {
    await this.generateImage(data);
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  }
}