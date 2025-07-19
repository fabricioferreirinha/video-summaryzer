@echo off
echo Installing AI Video Transcriber...
echo.

REM Create node_modules directory if it doesn't exist
if not exist "node_modules" mkdir node_modules

REM Install packages one by one
echo Installing Next.js...
npm install next@14.0.0 --save

echo Installing React...
npm install react@18.2.0 react-dom@18.2.0 --save

echo Installing TypeScript...
npm install typescript@5.3.3 --save

echo Installing Tailwind CSS...
npm install tailwindcss@3.3.0 autoprefixer@10.4.14 postcss@8.4.24 --save

echo Installing UI Libraries...
npm install class-variance-authority@0.7.0 clsx@2.0.0 lucide-react@0.263.1 tailwind-merge@1.14.0 tailwindcss-animate@1.0.7 --save

echo Installing Dev Dependencies...
npm install @types/node@20.0.0 @types/react@18.2.0 @types/react-dom@18.2.0 eslint@8.42.0 eslint-config-next@14.0.0 --save-dev

echo.
echo Installation complete!
echo Run 'npm run dev' to start the development server.
pause