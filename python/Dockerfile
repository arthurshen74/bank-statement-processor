FROM python:3.11-slim

# poppler-utils provides pdftotext, which pdftotext_processor.py shells out to
# for Kreditkarte statements. Without it, credit card extraction fails at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# app.py resolves 'uploads' and 'static' relative to the working directory;
# both are bind-mounted here by compose.
RUN mkdir -p uploads static

EXPOSE 5001

CMD ["python", "app.py"]
