import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/app.js';
import { errorHandler } from './presentation/http/middlewares/errorHandler.js';
import { rateLimitMiddleware } from './presentation/http/middlewares/rateLimitMiddleware.js';
import { authMiddleware } from './presentation/http/middlewares/authMiddleware.js';

// Repositories
import { EventRepository } from './infrastructure/database/supabase/EventRepository.js';
import { IntegrationSnapshotRepository } from './infrastructure/database/supabase/IntegrationSnapshotRepository.js';
import { ProjectRepository } from './infrastructure/database/supabase/ProjectRepository.js';
import { UserRepository } from './infrastructure/database/supabase/UserRepository.js';

// Services
import { EventValidationService } from './domain/services/EventValidationService.js';
import { TimeCalculationService } from './domain/services/TimeCalculationService.js';
import { IdLookupService } from './domain/services/IdLookupService.js';

// File Storage
import { CSVGenerator } from './infrastructure/file-storage/CSVGenerator.js';
import { XLSXGenerator } from './infrastructure/file-storage/XLSXGenerator.js';
import { XLSXParser } from './infrastructure/file-storage/XLSXParser.js';
import { LegacyEventsXLSXParser } from './infrastructure/file-storage/LegacyEventsXLSXParser.js';
import { InMemoryTtlCache } from './infrastructure/cache/InMemoryTtlCache.js';

// External Services
import { ArtiaAuthService } from './infrastructure/external/ArtiaAuthService.js';
import { ArtiaDBService } from './infrastructure/external/ArtiaDBService.js';
import { ArtiaHoursReadService } from './infrastructure/external/ArtiaHoursReadService.js';
import { FactorialService } from './infrastructure/external/FactorialService.js';
import { SupabaseAuthService } from './infrastructure/auth/SupabaseAuthService.js';

// Use Cases
import { CreateEventUseCase } from './application/use-cases/events/CreateEventUseCase.js';
import { UpdateEventUseCase } from './application/use-cases/events/UpdateEventUseCase.js';
import { DeleteEventUseCase } from './application/use-cases/events/DeleteEventUseCase.js';
import { ListEventsUseCase } from './application/use-cases/events/ListEventsUseCase.js';
import { MoveEventUseCase } from './application/use-cases/events/MoveEventUseCase.js';
import { ImportLegacyEventsUseCase } from './application/use-cases/events/ImportLegacyEventsUseCase.js';
import { ImportProjectsUseCase } from './application/use-cases/projects/ImportProjectsUseCase.js';
import { SearchProjectsUseCase } from './application/use-cases/projects/SearchProjectsUseCase.js';
import { ExportToCSVUseCase } from './application/use-cases/exports/ExportToCSVUseCase.js';
import { ExportToXLSXUseCase } from './application/use-cases/exports/ExportToXLSXUseCase.js';
import { LoginWithArtiaUseCase } from './application/use-cases/auth/LoginWithArtiaUseCase.js';
import { LoginWithArtiaDBUseCase } from './application/use-cases/auth/LoginWithArtiaDBUseCase.js';
import { RegisterWithFactorialUseCase } from './application/use-cases/auth/RegisterWithFactorialUseCase.js';
import { LoginUseCase } from './application/use-cases/auth/LoginUseCase.js';
import { GetWorkedHoursComparisonUseCase } from './application/use-cases/hours/GetWorkedHoursComparisonUseCase.js';
import { IntegrationReadModelService } from './application/services/IntegrationReadModelService.js';

// Controllers
import { EventController } from './presentation/http/controllers/EventController.js';
import { ProjectController } from './presentation/http/controllers/ProjectController.js';
import { ExportController } from './presentation/http/controllers/ExportController.js';
import { AuthController } from './presentation/http/controllers/AuthController.js';
import { ArtiaAuthController } from './presentation/http/controllers/ArtiaAuthController.js';
import { ArtiaDBAuthController } from './presentation/http/controllers/ArtiaDBAuthController.js';
import { FactorialAuthController } from './presentation/http/controllers/FactorialAuthController.js';
import { WorkedHoursController } from './presentation/http/controllers/WorkedHoursController.js';

// Routes
import { createEventRoutes } from './presentation/http/routes/eventRoutes.js';
import { createProjectRoutes } from './presentation/http/routes/projectRoutes.js';
import { createExportRoutes } from './presentation/http/routes/exportRoutes.js';
import { createAuthRoutes } from './presentation/http/routes/authRoutes.js';
import { createArtiaAuthRoutes } from './presentation/http/routes/artiaAuthRoutes.js';
import { createArtiaDBAuthRoutes } from './presentation/http/routes/artiaDBAuthRoutes.js';
import { createFactorialAuthRoutes } from './presentation/http/routes/factorialAuthRoutes.js';
import { createWorkedHoursRoutes } from './presentation/http/routes/workedHoursRoutes.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/localhost:\d+$/
];

if (config.corsOrigin && config.corsOrigin !== '*') {
  allowedOrigins.push(config.corsOrigin);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === 'string') {
        return allowed.replace(/\/$/, '') === normalizedOrigin;
      }

      return allowed.test(normalizedOrigin);
    });

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${normalizedOrigin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);

// Dependency Injection
const eventRepository = new EventRepository();
const integrationSnapshotRepository = new IntegrationSnapshotRepository();
const projectRepository = new ProjectRepository();
const userRepository = new UserRepository();

const eventValidationService = new EventValidationService();
const timeCalculationService = new TimeCalculationService();
const idLookupService = new IdLookupService(projectRepository);

const csvGenerator = new CSVGenerator();
const xlsxGenerator = new XLSXGenerator();
const xlsxParser = new XLSXParser();
const legacyEventsXLSXParser = new LegacyEventsXLSXParser();
const inMemoryCache = new InMemoryTtlCache();

const artiaAuthService = new ArtiaAuthService();
const artiaDBService = new ArtiaDBService();
const artiaHoursReadService = new ArtiaHoursReadService();
const factorialService = new FactorialService();
const supabaseAuthService = new SupabaseAuthService();
const integrationReadModelService = new IntegrationReadModelService({
  snapshotRepository: integrationSnapshotRepository,
  artiaDBService,
  factorialService,
  artiaHoursReadService,
  inMemoryCache
});

const createEventUseCase = new CreateEventUseCase(eventRepository, eventValidationService);
const updateEventUseCase = new UpdateEventUseCase(eventRepository, eventValidationService);
const deleteEventUseCase = new DeleteEventUseCase(eventRepository);
const listEventsUseCase = new ListEventsUseCase(eventRepository);
const moveEventUseCase = new MoveEventUseCase(eventRepository, eventValidationService);
const importLegacyEventsUseCase = new ImportLegacyEventsUseCase(
  eventRepository,
  legacyEventsXLSXParser,
  projectRepository
);

const importProjectsUseCase = new ImportProjectsUseCase(projectRepository, xlsxParser);
const searchProjectsUseCase = new SearchProjectsUseCase(projectRepository);

const exportToCSVUseCase = new ExportToCSVUseCase(eventRepository, csvGenerator);
const exportToXLSXUseCase = new ExportToXLSXUseCase(eventRepository, xlsxGenerator);

const loginWithArtiaUseCase = new LoginWithArtiaUseCase(artiaAuthService, userRepository);
const loginWithArtiaDBUseCase = new LoginWithArtiaDBUseCase(artiaDBService, userRepository);

const registerWithFactorialUseCase = new RegisterWithFactorialUseCase(
  factorialService,
  userRepository,
  supabaseAuthService
);
const loginUseCase = new LoginUseCase(
  userRepository,
  supabaseAuthService,
  factorialService
);
const getWorkedHoursComparisonUseCase = new GetWorkedHoursComparisonUseCase(
  eventRepository,
  userRepository,
  integrationReadModelService
);

const eventController = new EventController(
  createEventUseCase,
  updateEventUseCase,
  deleteEventUseCase,
  listEventsUseCase,
  moveEventUseCase,
  importLegacyEventsUseCase,
  integrationReadModelService
);

const projectController = new ProjectController(
  importProjectsUseCase,
  searchProjectsUseCase,
  projectRepository,
  integrationReadModelService
);

const exportController = new ExportController(exportToCSVUseCase, exportToXLSXUseCase);

const authController = new AuthController(
  registerWithFactorialUseCase,
  loginUseCase,
  supabaseAuthService,
  userRepository
);
const artiaAuthController = new ArtiaAuthController(loginWithArtiaUseCase, artiaAuthService);
const artiaDBAuthController = new ArtiaDBAuthController(loginWithArtiaDBUseCase, artiaDBService);

const factorialAuthController = new FactorialAuthController(registerWithFactorialUseCase, loginUseCase);
const workedHoursController = new WorkedHoursController(getWorkedHoursComparisonUseCase);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', createAuthRoutes(authController));
app.use('/api/v1/artia-auth', createArtiaAuthRoutes(artiaAuthController));
app.use('/api/v1/artia-db', createArtiaDBAuthRoutes(artiaDBAuthController));
app.use('/api/v1/factorial-auth', createFactorialAuthRoutes(factorialAuthController));
app.use('/api/v1/worked-hours', createWorkedHoursRoutes(workedHoursController, authMiddleware));
app.use('/api/v1/events', createEventRoutes(eventController));
app.use('/api/v1/projects', createProjectRoutes(projectController));
app.use('/api/v1/exports', createExportRoutes(exportController));

// Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`CORS ready for localhost and 127.0.0.1 dev origins`);
      console.log('Database: Supabase');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
