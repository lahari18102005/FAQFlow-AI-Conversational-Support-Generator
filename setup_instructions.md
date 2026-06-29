# FAQFlow AI – Setup Instructions

Follow these steps to get the project running locally.

## Prerequisites
- Python 3.8+
- Node.js 16+
- Gemini API Key (optional but recommended)

## Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
4. Start the backend server:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

## Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Usage
1. Open the landing page and click "Get Started".
2. Register a new account.
3. Create a new chat session from the sidebar.
4. Type your question in the chat box or use the microphone icon for voice input.
5. Click on suggested follow-up questions to continue the conversation.

## Admin Features
- To update the FAQ dataset, send a `POST` request to `/admin/upload-faq` with a JSON file.
- The system will automatically rebuild the FAISS index for real-time updates.
