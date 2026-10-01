import WorkloadCreate from './Create';
import WorkloadEdit from './Edit';
import { createNativeWorkloadRoutes } from './routeFactory';

export const createWorkloadRoutes = createNativeWorkloadRoutes(WorkloadCreate, WorkloadEdit).filter(
  route => route.path.endsWith('/new'),
);

export { createNativeWorkloadRoutes };

export const editWorkloadRoutes = (PATH: string) =>
  createNativeWorkloadRoutes(WorkloadCreate, WorkloadEdit, PATH).filter(route =>
    route.path.endsWith('/:name/edit'),
  );

export default createWorkloadRoutes;
