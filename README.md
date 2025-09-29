# Excel AI Analyzer Platform

A powerful, AI-driven platform for analyzing Excel files through natural language queries. Upload your spreadsheets and ask questions in plain English to get instant insights, visualizations, and data analysis.

## ✨ Features

### 🚀 Core Functionality
- **Smart Excel Processing**: Handles .xlsx and .xls files with automatic data cleaning
- **Natural Language Queries**: Ask questions about your data in plain English
- **AI-Powered Analysis**: Intelligent response generation based on query intent
- **Interactive Visualizations**: Automatic chart generation (line, bar, pie charts)
- **Real-time Chat Interface**: Conversational data exploration experience

### 🧠 AI Capabilities
- **Query Intent Recognition**: Automatically detects summary, trend, comparison, and aggregation queries
- **Smart Data Type Detection**: Identifies numeric, text, and date columns automatically
- **Contextual Responses**: Provides relevant insights based on your specific questions
- **Data Quality Analysis**: Automatic assessment of completeness and data integrity

### 📊 Data Processing
- **Messy Data Handling**: Cleans inconsistent formatting and handles missing values
- **Column Name Normalization**: Automatically fixes unnamed or problematic column headers
- **Type Inference**: Smart detection of numbers, dates, and text data
- **Statistical Analysis**: Automatic calculation of min, max, average, and totals

### 🎨 User Experience
- **Drag & Drop Upload**: Intuitive file upload with visual feedback
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Preview**: Instant data preview after file upload
- **Quick Action Buttons**: Pre-built queries for common analysis tasks
- **Loading States**: Smooth animations and progress indicators

## 🛠️ Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS for modern, responsive design
- **Charts**: Recharts for interactive data visualizations
- **Excel Processing**: SheetJS (xlsx) for robust file parsing
- **Icons**: Lucide React for beautiful, consistent iconography
- **Build Tool**: Vite for fast development and optimized builds

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kannan-2002/React-AI-Data-Agent.git
   cd React-AI-Data-Agent

   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application
   

## 📖 How to Use

### 1. Upload Your Excel File
- Drag and drop your Excel file (.xlsx or .xls) onto the upload area
- Or click to browse and select your file
- The platform will automatically process and clean your data

### 2. Explore Your Data
- View the automatic data preview showing your columns and sample rows
- Check the data quality summary for completeness metrics
- Review the detected data types (numeric, text, date)

### 3. Ask Questions
Use natural language to query your data:

**Summary Questions:**
- "Give me a summary of the data"
- "What does this data contain?"
- "Describe the dataset"

**Trend Analysis:**
- "Show me trends over time"
- "How has [column] changed?"
- "What are the growth patterns?"

**Statistical Queries:**
- "What are the totals?"
- "Show me averages"
- "Find the highest values"

**Ranking Questions:**
- "Top 10 values"
- "Which has the highest sales?"
- "Show me the best performers"

**Comparison Analysis:**
- "Compare categories"
- "Which is better?"
- "Show differences between groups"

### 4. Interpret Results
- View generated charts and visualizations
- Examine detailed data tables
- Read AI-generated insights and explanations
