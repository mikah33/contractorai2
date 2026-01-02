# Vision Cam Feature - Implementation Plan

## Overview
Vision Cam is an AI-powered project visualization feature that allows contractors to:
1. Take a photo of a project/site
2. Enter a prompt describing desired changes
3. Generate an AI-enhanced image using fal.ai Nano Banana Pro
4. Attach the generated image to a project or email it directly

## User Flow

```
[+] Button → Vision Cam → Tutorial (first time) → Camera → Enter Prompt → Generate → Save/Attach/Email
```

### Tutorial Flow (First-Time Users)
1. **Step 1**: "Take a photo of your project site"
2. **Step 2**: "Enter a prompt describing how you want it to look"
3. **Step 3**: "Attach to project or email directly to client"
4. **Checkbox**: "Don't show this again" → saves to user preferences

---

## Implementation Details

### 1. UI Components

#### A. MobileBottomNav.tsx - Add Vision Cam Button
**Location**: Above the Photos button in the + modal
**Position**: Lines 292-321 (before Photos button)

```tsx
// Vision Cam Button - ABOVE Photos
<div className="px-4 pb-2">
  <button
    onClick={() => handleModeSelect('vision-cam')}
    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/50 hover:border-purple-500 active:scale-[0.98] transition-all"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
      <Eye className="w-7 h-7 text-white" /> {/* or Wand2/Sparkles */}
    </div>
    <div className="flex-1 text-left">
      <span className="font-semibold text-white text-lg">Vision Cam</span>
      <p className="text-sm text-zinc-400">AI-powered project visualization</p>
    </div>
    <ChevronRight className="w-6 h-6 text-purple-400" />
  </button>
</div>
```

#### B. VisionCamModal.tsx - Main Component
**Location**: `/src/components/vision/VisionCamModal.tsx`

```tsx
interface VisionCamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'tutorial' | 'capture' | 'prompt' | 'generating' | 'result';

interface VisionCamState {
  step: Step;
  capturedImage: string | null;
  prompt: string;
  generatedImage: string | null;
  isGenerating: boolean;
  error: string | null;
}
```

**Features**:
- Full-screen modal with safe area insets
- Camera capture (native camera or file picker)
- Prompt input with suggestions
- Loading state during generation
- Result view with save/attach/email options

#### C. TutorialOverlay.tsx - First-Time Tutorial
**Location**: `/src/components/vision/TutorialOverlay.tsx`

```tsx
interface TutorialOverlayProps {
  onComplete: () => void;
  onDismiss: () => void;
}

// 3-step carousel with:
// Step 1: Camera icon + "Take a photo of your project"
// Step 2: Wand icon + "Describe the transformation"
// Step 3: Share icon + "Save, attach, or email"
// Checkbox: "Don't show this again"
```

---

### 2. State Management

#### A. settingsStore.ts - Tutorial Preferences
**Location**: `/src/stores/settingsStore.ts`

```tsx
interface SettingsState {
  tutorialPreferences: {
    visionCamTutorialHidden: boolean;
    // Future tutorials can be added here
  };
  fetchSettings: () => Promise<void>;
  updateTutorialPreference: (key: string, value: boolean) => Promise<void>;
}
```

**Database Table**: `user_settings` (or add columns to `profiles`)
```sql
ALTER TABLE profiles ADD COLUMN tutorial_preferences JSONB DEFAULT '{}';
```

#### B. photosStore.ts - Add AI Category
Update the `category` field to support:
- `'general'`
- `'project'`
- `'ai-generated'` ← NEW

**Database**: The existing `project_photos` table already supports this via the `category` column.

---

### 3. fal.ai Integration

#### A. API Configuration
**Endpoint**: `https://fal.run/fal-ai/nano-banana-pro`
**Cost**: $0.15/image (4K resolution costs double)
**Install**: `npm install --save @fal-ai/client`

#### B. Service File
**Location**: `/src/lib/ai/visionCam.ts`

```tsx
import { fal } from "@fal-ai/client";

// Configure with API key from environment
fal.config({
  credentials: import.meta.env.VITE_FAL_API_KEY
});

interface GenerateVisionParams {
  prompt: string;
  imageUrl?: string; // Base image for img2img
  negativePrompt?: string;
}

interface GenerateVisionResult {
  imageUrl: string;
  seed: number;
  width: number;
  height: number;
}

export async function generateVisionImage(params: GenerateVisionParams): Promise<GenerateVisionResult> {
  const result = await fal.subscribe("fal-ai/nano-banana-pro", {
    input: {
      prompt: params.prompt,
      image_url: params.imageUrl, // for img2img
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted",
      num_inference_steps: 30,
      guidance_scale: 7.5,
    },
    logs: true,
    onQueueUpdate: (update) => {
      console.log("Queue update:", update);
    },
  });

  return {
    imageUrl: result.data.images[0].url,
    seed: result.data.seed,
    width: result.data.images[0].width,
    height: result.data.images[0].height,
  };
}
```

#### C. Environment Variable
Add to `.env`:
```
VITE_FAL_API_KEY=your_fal_api_key_here
```

---

### 4. Storage

#### A. Supabase Storage Bucket
**Option 1**: Use existing `project-photos` bucket with subfolder
- Path: `{userId}/ai-generated/{timestamp}.jpg`

**Option 2**: Create new bucket `ai-generated-images`
- Requires Supabase dashboard configuration

**Recommendation**: Use Option 1 for simplicity (existing bucket, just new folder path)

#### B. Database Record
Use existing `project_photos` table with:
```tsx
{
  user_id: userId,
  project_id: selectedProjectId || null,
  image_url: generatedImageUrl,
  category: 'ai-generated',
  is_progress_photo: false,
  metadata: {
    type: 'ai-generated',
    prompt: userPrompt,
    sourceImage: originalPhotoUrl,
    model: 'fal-ai/nano-banana-pro',
    seed: resultSeed,
    generatedAt: new Date().toISOString()
  }
}
```

---

### 5. Settings Page - Tutorials Section

#### Add to Settings.tsx

**Menu Item** (add to `menuItems` array around line 455):
```tsx
{
  id: 'tutorials' as SettingsSection,
  icon: GraduationCap, // or BookOpen
  label: 'Tutorials',
  description: 'Manage feature tutorials',
  bgColor: 'bg-orange-500/20',
  iconColor: 'text-orange-500'
},
```

**Section Content**:
```tsx
case 'tutorials':
  return (
    <div className="space-y-3">
      {/* Vision Cam Tutorial */}
      <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="font-semibold text-white">Vision Cam Tutorial</p>
              <p className="text-sm text-zinc-400">Show intro when opening Vision Cam</p>
            </div>
          </div>
          <Toggle
            enabled={!tutorialPreferences.visionCamTutorialHidden}
            onChange={() => toggleTutorial('visionCamTutorialHidden')}
          />
        </div>
      </div>

      {/* Reset All Tutorials Button */}
      <button
        onClick={resetAllTutorials}
        className="w-full py-3 text-orange-500 font-medium"
      >
        Reset All Tutorials
      </button>
    </div>
  );
```

---

### 6. Gallery Integration

#### PhotosGallery.tsx - Add AI Generated Filter
Add new filter option alongside "Projects" and "General":

```tsx
const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'project', label: 'Projects' },
  { id: 'general', label: 'General' },
  { id: 'ai-generated', label: 'AI Generated' }, // NEW
];
```

The existing filtering logic will work automatically since it filters by `category`.

---

### 7. Attach to Project Flow

After generating an image, user can:
1. **Save to Gallery** → Saves with `category: 'ai-generated'`, no project
2. **Attach to Project** → Opens project picker (reuse from PhotoUploadModal)
3. **Email to Client** → Opens share/email flow

---

## File Structure

```
src/
├── components/
│   └── vision/
│       ├── VisionCamModal.tsx      # Main modal component
│       ├── TutorialOverlay.tsx     # First-time tutorial
│       └── GenerationProgress.tsx  # Loading/progress indicator
├── lib/
│   └── ai/
│       └── visionCam.ts            # fal.ai API integration
└── stores/
    └── settingsStore.ts            # Tutorial preferences (new file)
```

---

## Implementation Order

1. **Phase 1: Core Infrastructure**
   - [ ] Create `settingsStore.ts` for tutorial preferences
   - [ ] Add `tutorial_preferences` to profiles table (or create user_settings)
   - [ ] Install `@fal-ai/client` package
   - [ ] Create `visionCam.ts` service file
   - [ ] Add `VITE_FAL_API_KEY` to environment

2. **Phase 2: UI Components**
   - [ ] Create `VisionCamModal.tsx` with all steps
   - [ ] Create `TutorialOverlay.tsx`
   - [ ] Add Vision Cam button to `MobileBottomNav.tsx`
   - [ ] Handle `vision-cam` mode in `handleModeSelect`

3. **Phase 3: Integration**
   - [ ] Update `photosStore.ts` to handle `ai-generated` category
   - [ ] Add AI Generated filter to `PhotosGallery.tsx`
   - [ ] Implement save/attach/email flow in result step

4. **Phase 4: Settings**
   - [ ] Add Tutorials section to Settings page
   - [ ] Wire up tutorial preference toggle

---

## API Cost Consideration

- **Cost**: $0.15 per image generation
- **4K Resolution**: $0.30 per image (double rate)
- **Recommendation**: Default to standard resolution, offer 4K as premium option

---

## Error Handling

1. **API Failures**: Show retry button, suggest checking connection
2. **Rate Limits**: Queue requests, show position in queue
3. **Invalid Images**: Validate image format/size before upload
4. **Prompt Issues**: Provide prompt suggestions and validation

---

## Future Enhancements

1. **Prompt Templates**: Pre-built prompts for common renovations
   - "Modern kitchen renovation with white cabinets"
   - "Landscaped front yard with new lawn"
   - "Fresh exterior paint in [color]"

2. **Before/After Slider**: Compare original vs generated

3. **Multiple Variations**: Generate 2-4 options per prompt

4. **Style Presets**: Different architectural/design styles

5. **Usage Tracking**: Track generations per user for potential billing
