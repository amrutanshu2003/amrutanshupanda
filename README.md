# Portfolio (Python + MongoDB)

This is a modern portfolio website built with Flask and MongoDB.

## Your details already added
- Name: Amrutanshu Panda
- Email: amrutanshu20003@gmail.com
- Phone: 9337606293

## Setup
1. Install dependencies:
   pip install -r requirements.txt
2. Start MongoDB locally (default URI used: mongodb://127.0.0.1:27017)
3. Run app:
   python app.py
4. Open in browser:
   http://127.0.0.1:5000

## Edit and save everything in DB
- Open admin panel:
  http://127.0.0.1:5000/admin
- Update fields and click `Save To MongoDB`
- Home page automatically shows saved MongoDB data

## Photo
- Put your image at:
  static/images/profile.jpg

## Optional environment variables
- MONGO_URI
- MONGO_DB
- MONGO_COLLECTION

If MongoDB is not available, app still runs with fallback profile data.
