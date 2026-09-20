import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function frameSaverPlugin(): Plugin {
  return {
    name: 'frame-saver-api',
    configureServer(server) {
      server.middlewares.use('/api/save-spritesheet', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { dataUrl, filename = 'walk.png' } = JSON.parse(body);
            if (!dataUrl) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing dataUrl' }));
              return;
            }

            const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const targetDir = path.resolve(process.cwd(), 'public/character_sundor_v');

            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const filePath = path.join(targetDir, filename);
            fs.writeFileSync(filePath, buffer);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, path: `/character_sundor_v/${filename}` }));
          } catch (error) {
            console.error('Save error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      });

      server.middlewares.use('/api/save-frames', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { frames } = JSON.parse(body);
            if (!Array.isArray(frames)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid frames array' }));
              return;
            }

            const targetDir = path.resolve(process.cwd(), 'public/character_sundor_v/frames');
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const savedPaths: string[] = [];
            for (const f of frames) {
              const base64Data = f.dataUrl.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const filename = `${f.id}.png`;
              const filePath = path.join(targetDir, filename);
              fs.writeFileSync(filePath, buffer);
              savedPaths.push(`/character_sundor_v/frames/${filename}`);
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: savedPaths.length, paths: savedPaths }));
          } catch (error) {
            console.error('Frames save error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      });

      server.middlewares.use('/api/get-saved-frames', async (req, res) => {
        try {
          const targetDir = path.resolve(process.cwd(), 'public/character_sundor_v/frames');
          if (!fs.existsSync(targetDir)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ frames: [] }));
            return;
          }

          const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.png'));
          const frames = files
            .map((filename) => {
              const id = parseInt(path.basename(filename, '.png'), 10) || 0;
              const filePath = path.join(targetDir, filename);
              const buffer = fs.readFileSync(filePath);
              const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
              return {
                id,
                name: filename,
                dataUrl,
              };
            })
            .sort((a, b) => a.id - b.id);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ frames }));
        } catch (error) {
          console.error('Get frames error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), frameSaverPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
