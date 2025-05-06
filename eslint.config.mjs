import { config } from 'eslint-config-decent';

export default config({
  tsconfigRootDir: import.meta.dirname,
  enableJest: false,
  enableVitest: false,
  enableTestingLibrary: false,
});
