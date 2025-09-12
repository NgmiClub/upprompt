# Upprompt - AI Prompt Sharing Platform

A sophisticated platform for sharing, discovering, and collaborating on high-quality AI prompts. Built with React, TypeScript, and Supabase for modern web performance and real-time features.

## Features

### Core Functionality
- **AI Prompt Creation & Management** - Build and organize your AI prompts with tags and collections
- **Real-time Analytics Dashboard** - Track performance with live metrics and user insights
- **Prompt Collections** - Curate and share themed prompt collections with the community
- **AI Prompt Tester** - Test prompts across multiple AI models with cost estimation
- **Community Challenges** - Participate in themed prompt competitions with voting systems
- **Dynamic OpenGraph Images** - Automatically generated social media previews for each prompt

### User Experience
- **Professional Design** - Clean, modern interface with yellow-orange theme
- **Responsive Design** - Optimized for mobile, tablet, and desktop devices
- **Dark/Light Mode** - Complete theme support with proper contrast ratios
- **Smooth Animations** - Subtle transitions and hover effects throughout
- **Search & Filtering** - Advanced search with tag-based filtering system

### Social Features
- **User Profiles** - Customizable profiles with avatar upload and statistics
- **Community Interaction** - Upvote, bookmark, and share prompts
- **Leaderboards** - Community rankings based on prompt popularity
- **Real-time Updates** - Live data synchronization without page refreshes

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Shadcn UI built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Charts**: Recharts for data visualization
- **Backend**: Supabase (PostgreSQL + Real-time + Auth + Storage)
- **State Management**: React Query for server state
- **Icons**: Phosphor Icons
- **Fonts**: Outfit, Montserrat, JetBrains Mono

## Design System

### Color Palette
- **Primary**: Warm amber (#f59e0b)
- **Secondary**: Complementary orange and yellow tones
- **Theme**: Full dark/light mode support with CSS custom properties

### Typography
- **Display**: Montserrat for headings and branding
- **Body**: Outfit for readable body text
- **Code**: JetBrains Mono for technical content

### Components
- Consistent component library with shadcn/ui
- Custom theme integration with Tailwind CSS
- Responsive breakpoints and spacing system

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd upprompt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Database Setup

### Supabase Configuration
1. Create a new Supabase project
2. Set up authentication with OAuth providers (Google, GitHub)
3. Configure Row Level Security (RLS) policies
4. Set up real-time subscriptions for live updates

### Required Tables
- `prompts` - Store AI prompts with metadata
- `profiles` - User profile information
- `up_prompts` - Upvote tracking
- `bookmarks` - Saved prompts
- `collections` - Prompt collections
- `challenges` - Community challenges

## Features in Detail

### Analytics Dashboard
- **User-specific Analytics** - Personal performance metrics and trends
- **Weekly Growth Tracking** - Visual charts showing engagement over time
- **Top Performing Content** - Identify your most successful prompts
- **Community Insights** - See how you rank against other users

### Prompt Management
- **Rich Text Editor** - Create detailed prompts with formatting
- **Tag System** - Organize prompts with custom and suggested tags
- **Preview Mode** - See exactly how prompts appear to others
- **Quick Actions** - Copy, download, and share prompts easily

### Social Integration
- **OpenGraph Support** - Dynamic social media previews
- **Direct AI Platform Integration** - One-click prompt testing
- **Community Features** - Follow users, bookmark favorites
- **Sharing Tools** - Built-in sharing across social platforms

## Development Guidelines

### Code Organization
- Feature-based component structure
- Shared utilities in `/lib` directory
- Custom hooks in `/hooks` directory
- Type definitions with TypeScript interfaces

### Performance
- React Query for efficient data fetching and caching
- Lazy loading for route components
- Optimized images and assets
- Real-time subscriptions with automatic cleanup

### Security
- Row Level Security (RLS) on all database operations
- Secure authentication with Supabase Auth
- Input validation and sanitization
- No sensitive data in client-side code

## Contributing

We welcome contributions to Upprompt. Please ensure:
- Follow the existing code style and conventions
- Add TypeScript types for all new features
- Test your changes across different screen sizes
- Update documentation for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment

The application is optimized for deployment on modern hosting platforms:
- **Vite Build**: Optimized production builds
- **Static Assets**: Proper caching and CDN support
- **Environment Variables**: Secure configuration management
- **Database Migrations**: Version-controlled schema changes

---

**Upprompt** - A sophisticated platform for AI prompt engineering and community collaboration.
