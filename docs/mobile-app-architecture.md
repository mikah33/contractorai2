# ContractorAI Mobile App - Technical Architecture

## Architecture Overview

The ContractorAI mobile app follows an offline-first architecture with local data persistence, eliminating all backend dependencies. The app is built using React Native with Expo for cross-platform development.

## Technology Stack

### Core Framework
- **React Native**: 0.74.x with Expo SDK 51
- **TypeScript**: For type safety and better development experience
- **Expo**: For simplified development and deployment

### Navigation & UI
- **React Navigation 6**: Tab and stack navigation
- **NativeBase**: UI component library optimized for React Native
- **React Native Vector Icons**: Consistent iconography
- **React Native Gesture Handler**: Enhanced touch interactions

### State Management
- **Zustand**: Lightweight state management (migrated from web version)
- **React Context**: For global app settings and themes

### Data Persistence
- **Expo SQLite**: Complex relational data (projects, estimates, finances)
- **AsyncStorage**: Simple key-value storage (preferences, settings)
- **Expo FileSystem**: File and image storage

### Forms & Validation
- **React Hook Form**: Performant form handling
- **Yup**: Schema validation for calculator inputs

### Charts & Reports
- **Victory Native**: Chart components for financial reports
- **React Native Print**: PDF generation for estimates and reports

### Camera & Media
- **Expo Camera**: Receipt and progress photo capture
- **Expo Image Picker**: Gallery image selection
- **Expo Image Manipulator**: Image compression and processing

### Development & Testing
- **Expo Dev Tools**: Development and debugging
- **Jest**: Unit testing framework
- **Detox**: E2E testing for React Native

## Data Architecture

### Local Database Schema (SQLite)

```sql
-- Projects Table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    address TEXT,
    status TEXT CHECK(status IN ('draft', 'in_progress', 'completed', 'on_hold', 'cancelled')) DEFAULT 'draft',
    start_date TEXT,
    end_date TEXT,
    budget REAL DEFAULT 0,
    total_expenses REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('todo', 'in_progress', 'completed')) DEFAULT 'todo',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    due_date TEXT,
    assigned_to TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Estimates Table
CREATE TABLE estimates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK(status IN ('draft', 'sent', 'approved', 'rejected')) DEFAULT 'draft',
    total_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Estimate Line Items Table
CREATE TABLE estimate_items (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'each',
    unit_price REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    category TEXT CHECK(category IN ('material', 'labor', 'equipment', 'other')) DEFAULT 'other',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (estimate_id) REFERENCES estimates (id) ON DELETE CASCADE
);

-- Expenses Table
CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    vendor TEXT,
    receipt_photo TEXT,
    is_reimbursable BOOLEAN DEFAULT false,
    payment_method TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);

-- Calculations History Table
CREATE TABLE calculation_history (
    id TEXT PRIMARY KEY,
    trade_type TEXT NOT NULL,
    input_data TEXT NOT NULL, -- JSON string of calculation inputs
    results TEXT NOT NULL,     -- JSON string of calculation results
    total_cost REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Photos Table
CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    task_id TEXT,
    expense_id TEXT,
    file_path TEXT NOT NULL,
    caption TEXT,
    photo_type TEXT CHECK(photo_type IN ('progress', 'receipt', 'before', 'after', 'other')) DEFAULT 'other',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE
);
```

### AsyncStorage Keys
```typescript
const STORAGE_KEYS = {
  // App Settings
  THEME: '@contractorAI/theme',
  CURRENCY: '@contractorAI/currency',
  TAX_RATE: '@contractorAI/tax_rate',
  COMPANY_INFO: '@contractorAI/company_info',
  
  // User Preferences
  DEFAULT_MARKUP: '@contractorAI/default_markup',
  FAVORITE_TRADES: '@contractorAI/favorite_trades',
  RECENT_CALCULATIONS: '@contractorAI/recent_calculations',
  
  // App State
  LAST_BACKUP: '@contractorAI/last_backup',
  ONBOARDING_COMPLETED: '@contractorAI/onboarding_completed',
  TUTORIAL_VIEWED: '@contractorAI/tutorial_viewed'
} as const;
```

## Component Architecture

### Screen Components
```
src/screens/
├── calculators/
│   ├── CalculatorListScreen.tsx
│   ├── TradeCalculatorScreen.tsx
│   └── CalculationResultsScreen.tsx
├── projects/
│   ├── ProjectListScreen.tsx
│   ├── ProjectDetailScreen.tsx
│   ├── TaskListScreen.tsx
│   └── ProjectFormScreen.tsx
├── finance/
│   ├── FinanceDashboardScreen.tsx
│   ├── ExpenseListScreen.tsx
│   ├── AddExpenseScreen.tsx
│   └── ReportsScreen.tsx
├── estimates/
│   ├── EstimateListScreen.tsx
│   ├── EstimateDetailScreen.tsx
│   ├── CreateEstimateScreen.tsx
│   └── EstimatePreviewScreen.tsx
└── settings/
    ├── SettingsScreen.tsx
    ├── CompanyInfoScreen.tsx
    └── BackupScreen.tsx
```

### Reusable Components
```
src/components/
├── common/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
├── forms/
│   ├── FormField.tsx
│   ├── FormSelect.tsx
│   ├── FormRadioGroup.tsx
│   └── FormCheckbox.tsx
├── calculators/
│   ├── TradeSelector.tsx
│   ├── CalculatorForm.tsx
│   ├── ResultsDisplay.tsx
│   └── CalculationCard.tsx
├── projects/
│   ├── ProjectCard.tsx
│   ├── TaskItem.tsx
│   ├── ProgressBar.tsx
│   └── ProjectStats.tsx
├── finance/
│   ├── ExpenseItem.tsx
│   ├── BudgetCard.tsx
│   ├── FinanceChart.tsx
│   └── ReceiptPhoto.tsx
└── navigation/
    ├── TabBar.tsx
    ├── Header.tsx
    └── NavigationButton.tsx
```

## Service Layer

### Data Services
```typescript
// src/services/DatabaseService.ts
export class DatabaseService {
  private db: SQLite.WebSQLDatabase | null = null;
  
  async initialize(): Promise<void>
  async createTables(): Promise<void>
  async dropTables(): Promise<void>
  async executeQuery<T>(query: string, params?: any[]): Promise<T[]>
  async backup(): Promise<string>
  async restore(backupData: string): Promise<void>
}

// src/services/ProjectService.ts
export class ProjectService {
  async createProject(project: CreateProjectInput): Promise<Project>
  async getProjects(filter?: ProjectFilter): Promise<Project[]>
  async getProjectById(id: string): Promise<Project | null>
  async updateProject(id: string, updates: Partial<Project>): Promise<Project>
  async deleteProject(id: string): Promise<void>
  async getProjectStats(projectId: string): Promise<ProjectStats>
}

// src/services/CalculatorService.ts
export class CalculatorService {
  async calculateTrade(tradeId: string, inputs: TradeInputs): Promise<CalculationResult[]>
  async saveCalculation(calculation: SavedCalculation): Promise<void>
  async getCalculationHistory(tradeId?: string): Promise<SavedCalculation[]>
  async exportCalculation(calculationId: string, format: 'pdf' | 'json'): Promise<string>
}

// src/services/StorageService.ts
export class StorageService {
  async setItem<T>(key: string, value: T): Promise<void>
  async getItem<T>(key: string): Promise<T | null>
  async removeItem(key: string): Promise<void>
  async clear(): Promise<void>
  async getAllKeys(): Promise<string[]>
}
```

### Calculator Logic
```typescript
// src/services/calculators/ConcreteCalculator.ts
export class ConcreteCalculator {
  calculate(inputs: ConcreteInputs): CalculationResult[] {
    const area = inputs.length * inputs.width;
    const volume = area * (inputs.thickness / 12); // Convert inches to feet
    const yardage = volume / 27; // Convert cubic feet to cubic yards
    
    const materialCost = yardage * this.getConcretePricePerYard(inputs.grade);
    const laborCost = area * this.getLaborRatePerSqFt();
    const equipmentCost = this.getEquipmentCost(yardage);
    
    return [
      { label: 'Area', value: area, unit: 'sq ft' },
      { label: 'Volume', value: volume, unit: 'cu ft' },
      { label: 'Concrete Yardage', value: yardage, unit: 'cu yd', cost: materialCost },
      { label: 'Labor Cost', value: laborCost, unit: 'USD' },
      { label: 'Equipment Cost', value: equipmentCost, unit: 'USD' },
      { label: 'Total Cost', value: materialCost + laborCost + equipmentCost, unit: 'USD' }
    ];
  }
}
```

## Navigation Structure

### Tab Navigation
```typescript
const TabNavigator = createBottomTabNavigator();

function AppTabs() {
  return (
    <TabNavigator.Navigator
      screenOptions={{
        tabBarStyle: { height: 60, paddingBottom: 5 },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280'
      }}
    >
      <TabNavigator.Screen 
        name="Calculators" 
        component={CalculatorStack}
        options={{
          tabBarIcon: ({ color, size }) => <Calculator color={color} size={size} />
        }}
      />
      <TabNavigator.Screen 
        name="Projects" 
        component={ProjectStack}
        options={{
          tabBarIcon: ({ color, size }) => <FolderOpen color={color} size={size} />
        }}
      />
      <TabNavigator.Screen 
        name="Finance" 
        component={FinanceStack}
        options={{
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />
        }}
      />
      <TabNavigator.Screen 
        name="Estimates" 
        component={EstimateStack}
        options={{
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />
        }}
      />
      <TabNavigator.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />
        }}
      />
    </TabNavigator.Navigator>
  );
}
```

### Stack Navigators
```typescript
const CalculatorStackNavigator = createStackNavigator();

function CalculatorStack() {
  return (
    <CalculatorStackNavigator.Navigator>
      <CalculatorStackNavigator.Screen 
        name="CalculatorList" 
        component={CalculatorListScreen}
        options={{ title: 'Pricing Calculators' }}
      />
      <CalculatorStackNavigator.Screen 
        name="TradeCalculator" 
        component={TradeCalculatorScreen}
        options={({ route }) => ({ title: route.params.tradeName })}
      />
      <CalculatorStackNavigator.Screen 
        name="CalculationResults" 
        component={CalculationResultsScreen}
        options={{ title: 'Calculation Results' }}
      />
    </CalculatorStackNavigator.Navigator>
  );
}
```

## State Management

### Store Structure (Zustand)
```typescript
// src/stores/useAppStore.ts
interface AppState {
  // App Settings
  theme: 'light' | 'dark';
  currency: string;
  taxRate: number;
  companyInfo: CompanyInfo;
  
  // UI State
  isLoading: boolean;
  currentScreen: string;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrency: (currency: string) => void;
  setTaxRate: (rate: number) => void;
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void;
}

// src/stores/useProjectStore.ts
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  
  // Actions
  loadProjects: () => Promise<void>;
  createProject: (project: CreateProjectInput) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

// src/stores/useCalculatorStore.ts
interface CalculatorState {
  calculationHistory: SavedCalculation[];
  currentCalculation: CalculationResult[] | null;
  
  // Actions
  saveCalculation: (calculation: SavedCalculation) => Promise<void>;
  loadCalculationHistory: () => Promise<void>;
  setCurrentCalculation: (results: CalculationResult[] | null) => void;
}
```

## Security & Privacy

### Data Protection
- **Local Storage Only**: No data transmitted to external servers
- **File Encryption**: Sensitive data encrypted using device keychain
- **Secure Storage**: Biometric authentication for app access (optional)
- **Photo Privacy**: All images stored in app sandbox

### Permissions
```typescript
// Required Permissions
const PERMISSIONS = {
  ios: [
    'ios.permission.CAMERA',
    'ios.permission.PHOTO_LIBRARY'
  ],
  android: [
    'android.permission.CAMERA',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE'
  ]
};
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy load calculator components
const ConcreteCalculator = lazy(() => import('../components/calculators/ConcreteCalculator'));
const DeckCalculator = lazy(() => import('../components/calculators/DeckCalculator'));

// Dynamic imports for large datasets
const loadTradeData = (tradeId: string) => {
  return import(`../data/trades/${tradeId}.json`);
};
```

### Image Optimization
```typescript
// Image compression settings
const IMAGE_COMPRESSION_OPTIONS = {
  compress: 0.8,
  format: ImageManipulator.SaveFormat.JPEG,
  result: 'file'
};

// Resize large images
const THUMBNAIL_SIZE = { width: 300, height: 300 };
const FULL_SIZE = { width: 1200, height: 1200 };
```

### Memory Management
```typescript
// Cleanup functions for components
useEffect(() => {
  return () => {
    // Cleanup subscriptions
    // Clear intervals/timeouts
    // Cancel pending promises
  };
}, []);
```

## Error Handling

### Error Boundary
```typescript
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error locally
    this.logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Global Error Handler
```typescript
const ErrorHandler = {
  handleError: (error: Error, context: string) => {
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly message
    Alert.alert('Error', 'Something went wrong. Please try again.');
    
    // Log for debugging
    this.logError(error, context);
  },
  
  logError: (error: Error, context: string) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack
    };
    
    // Store in AsyncStorage for debugging
    StorageService.setItem('error_logs', errorLog);
  }
};
```

## Testing Strategy

### Unit Tests
```typescript
// Calculator logic tests
describe('ConcreteCalculator', () => {
  test('calculates concrete volume correctly', () => {
    const calculator = new ConcreteCalculator();
    const result = calculator.calculate({
      length: 10,
      width: 10,
      thickness: 4,
      grade: 'standard'
    });
    
    expect(result.find(r => r.label === 'Volume')?.value).toBe(33.33);
  });
});

// Component tests
describe('CalculatorForm', () => {
  test('renders all required fields', () => {
    const trade = mockTrades.concrete;
    render(<CalculatorForm trade={trade} />);
    
    trade.requiredFields.forEach(field => {
      expect(screen.getByLabelText(field.label)).toBeTruthy();
    });
  });
});
```

### Integration Tests
```typescript
// Database tests
describe('ProjectService', () => {
  test('creates and retrieves project', async () => {
    const projectData = mockProjectData();
    const createdProject = await ProjectService.createProject(projectData);
    const retrievedProject = await ProjectService.getProjectById(createdProject.id);
    
    expect(retrievedProject).toEqual(createdProject);
  });
});
```

## Build & Deployment

### Build Configuration
```json
{
  "expo": {
    "name": "ContractorAI",
    "slug": "contractor-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.contractorai.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.contractorai.mobile"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

This technical architecture provides a solid foundation for building a robust, offline-first mobile application that maintains all the core functionality of the original web application while optimizing for mobile usage patterns and performance.