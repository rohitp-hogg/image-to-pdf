document.addEventListener('DOMContentLoaded', () => {
    const { jsPDF } = window.jspdf;

    // DOM Elements
    const uploadInput = document.getElementById('image-upload');
    const dragArea = document.getElementById('drag-area');
    const mainLayout = document.getElementById('main-layout');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const actionContainer = document.getElementById('action-container');
    const createPdfBtn = document.getElementById('create-pdf-btn');
    const progressSection = document.getElementById('progress-section');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    // --- Theme Toggling Logic ---

    if (document.documentElement.classList.contains('dark')) {
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        themeToggleDarkIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDarkMode = document.documentElement.classList.contains('dark');
        localStorage.setItem('color-theme', isDarkMode ? 'dark' : 'light');
        themeToggleDarkIcon.classList.toggle('hidden');
        themeToggleLightIcon.classList.toggle('hidden');
    });

    // --- Custom Natural Sort Function ---
    const naturalSort = (a, b) => {
        const re = /(\d+)/g;
        const aParts = a.name.split(re);
        const bParts = b.name.split(re);

        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
            const aPart = aParts[i];
            const bPart = bParts[i];
            if (aPart !== bPart) {
                const isANum = !isNaN(aPart) && aPart.trim() !== '';
                const isBNum = !isNaN(bPart) && bPart.trim() !== '';
                if (isANum && isBNum) {
                    return parseInt(aPart, 10) - parseInt(bPart, 10);
                }
                return aPart.localeCompare(bPart);
            }
        }
        return aParts.length - bParts.length;
    };

    let uploadedImages = []; // Array to store file data (base64 strings)

    // --- Drag and Drop Logic ---
    dragArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragArea.classList.add('drag-area-highlight');
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.classList.remove('drag-area-highlight');
    });

    dragArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragArea.classList.remove('drag-area-highlight');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    // --- File Input Logic ---
    uploadInput.addEventListener('change', () => {
        handleFiles(uploadInput.files);
    });
    
    // --- File Handling and Preview (REWRITTEN FOR CORRECT SEQUENCING) ---
    const handleFiles = async (files) => {
        imagePreview.innerHTML = ''; // Clear previous previews
        const fileArray = Array.from(files).sort(naturalSort);

        if (fileArray.length === 0) {
            mainLayout.classList.remove('md:grid-cols-2');
            previewContainer.classList.add('opacity-0', 'pointer-events-none');
            actionContainer.classList.add('opacity-0', 'pointer-events-none');
            uploadedImages = [];
            return;
        }
        
        mainLayout.classList.add('md:grid-cols-2');
        previewContainer.classList.remove('opacity-0', 'pointer-events-none');
        actionContainer.classList.remove('opacity-0', 'pointer-events-none');

        // Create a function that reads a file and returns a promise
        const readFileAsDataURL = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ data: reader.result, name: file.name });
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        };

        // Create an array of promises
        const readPromises = fileArray.map(readFileAsDataURL);
        
        try {
            // Wait for all files to be read
            const loadedFiles = await Promise.all(readPromises);
            
            // The results are now guaranteed to be in the correct order
            uploadedImages = loadedFiles.map(f => f.data);

            // Now, create the preview images in the correct order
            loadedFiles.forEach(fileInfo => {
                const imgElement = document.createElement('img');
                imgElement.src = fileInfo.data;
                imgElement.className = 'w-full h-auto object-cover rounded-md shadow-sm aspect-square';
                imgElement.title = fileInfo.name;
                imagePreview.appendChild(imgElement);
            });
        } catch (error) {
            console.error("Error reading files:", error);
            // Optionally, show an error message to the user
        }
    };

    // --- PDF Creation Logic ---
    createPdfBtn.addEventListener('click', async () => {
        if (uploadedImages.length === 0) {
            const originalText = createPdfBtn.textContent;
            createPdfBtn.textContent = 'Upload images first!';
            createPdfBtn.classList.add('bg-red-500', 'hover:bg-red-600');
            createPdfBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
            createPdfBtn.disabled = true;
            
            setTimeout(() => {
                createPdfBtn.textContent = originalText;
                createPdfBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                createPdfBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
                createPdfBtn.disabled = false;
            }, 2500);
            return;
        }

        createPdfBtn.disabled = true;
        createPdfBtn.textContent = 'Generating...';
        createPdfBtn.classList.add('opacity-50', 'cursor-not-allowed');
        progressSection.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Initializing PDF document...';
        
        let doc = null; 
        const totalImages = uploadedImages.length;

        for (let i = 0; i < totalImages; i++) {
            const progress = ((i + 1) / totalImages) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Processing image ${i + 1} of ${totalImages}...`;
            
            await new Promise(resolve => setTimeout(resolve, 50));

            const imgData = uploadedImages[i];
            const img = new Image();
            img.src = imgData;

            await new Promise(resolve => {
              img.onload = resolve;
            });
            
            const imgWidth = img.width;
            const imgHeight = img.height;
            const orientation = imgWidth > imgHeight ? 'l' : 'p';

            if (i === 0) {
                doc = new jsPDF({
                    orientation: orientation,
                    unit: 'px',
                    format: [imgWidth, imgHeight]
                });
            } else {
                doc.addPage([imgWidth, imgHeight], orientation);
            }

            doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        }

        progressText.textContent = 'PDF created successfully! Saving file...';
        doc.save('images-to-pdf.pdf');

        setTimeout(() => {
            createPdfBtn.disabled = false;
            createPdfBtn.textContent = 'Create PDF';
            createPdfBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            progressSection.classList.add('hidden');
            progressBar.style.width = '0%';
        }, 1500);
    });
});

