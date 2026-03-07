import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '../src/presentation/http/middlewares/errorHandler.js';
import { rateLimitMiddleware } from '../src/presentation/http/middlewares/rateLimitMiddleware.js';

// Repositories
import { EventRepository } from '../src/infrastructure/database/supabase/EventRepository.js';
import { ProjectRepository } from '../src/infrastructure/database/supabase/ProjectRepository.js';
import { UserRepository } from '../src/infrastructure/database/supabase/UserRepository.js';

// Services
import { EventValidationService } from '../src/domain/services/EventValidationService.js';
import { IdLookupService } from '../src/domain/services/IdLookupService.js';

// File Storage
import { CSVGenerator } from '../src/infrastructure/file-storage/CSVGenerator.js';
import { XLSXGenerator } from '../src/infrastructure/file-storage/XLSXGenerator.js';
import { XLSXParser } from '../src/infrastructure/file-storage/XLSXParser.js';
import { LegacyEventsXLSXParser } from '../src/infrastructure/file-storage/LegacyEventsXLSXParser.js';

// Use Cases
import { CreateEventUseCase } from '../src/application/use-cases/events/CreateEventUseCase.js';
import { UpdateEventUseCase } from '../src/application/use-cases/events/UpdateEventUseCase.js';
import { DeleteEventUseCase } from '../src/application/use-cases/events/DeleteEventUseCase.js';
import { ListEventsUseCase } from '../src/application/use-cases/events/ListEventsUseCase.js';
import { MoveEventUseCase } from '../src/application/use-cases/events/MoveEventUseCase.js';
import { ImportLegacyEventsUseCase } from '../src/application/use-cases/events/ImportLegacyEventsUseCase.js';
import { ImportProjectsUseCase } from '../src/application/use-cases/projects/ImportProjectsUseCase.js';
import { SearchProjectsUseCase } from '../src/application/use-cases/projects/SearchProjectsUseCase.js';
import { ExportToCSVUseCase } from '../src/application/use-cases/exports/ExportToCSVUseCase.js';
import { ExportToXLSXUseCase } from '../src/application/use-cases/exports/ExportToXLSXUseCase.js';

// Controllers
import { EventController } from '../src/presentation/http/controllers/EventController.js';
import { ProjectController } from '../src/presentation/http/controllers/ProjectController.js';
import { ExportController } from '../src/presentation/http/controllers/ExportController.js';
import { AuthController } from '../src/presentation/http/controllers/AuthController.js';

// Routes
import { createEventRoutes } from '../src/presentation/http/routes/eventRoutes.js';
import { createProjectRoutes } from '../src/presentation/http/routes/projectRoutes.js';
import { createExportRoutes } from '../src/presentation/http/routes/exportRoutes.js';
import { createAuthRoutes } from '../src/presentation/http/routes/authRoutes.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);

// Supabase não precisa de cache de conexão (stateless)

// Dependency Injection
const eventRepository = new EventRepository();
const projectRepository = new ProjectRepository();
const userRepository = new UserRepository();

const eventValidationService = new EventValidationService();
const idLookupService = new IdLookupService(projectRepository);

const csvGenerator = new CSVGenerator();
const xlsxGenerator = new XLSXGenerator();
const xlsxParser = new XLSXParser();
const legacyEventsXLSXParser = new LegacyEventsXLSXParser();

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

const eventController = new EventController(
  createEventUseCase,
  updateEventUseCase,
  deleteEventUseCase,
  listEventsUseCase,
  moveEventUseCase,
  importLegacyEventsUseCase
);

const projectController = new ProjectController(
  importProjectsUseCase,
  searchProjectsUseCase,
  projectRepository
);

const exportController = new ExportController(exportToCSVUseCase, exportToXLSXUseCase);
const authController = new AuthController(userRepository);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', createAuthRoutes(authController));
app.use('/api/v1/events', createEventRoutes(eventController));
app.use('/api/v1/projects', createProjectRoutes(projectController));
app.use('/api/v1/exports', createExportRoutes(exportController));

// Error Handler
app.use(errorHandler);

// Vercel Serverless Handler
export default async (req, res) => {
  return app(req, res);
};
