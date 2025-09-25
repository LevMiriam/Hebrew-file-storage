# הגדרת Railway עבור אפליקציית אחסון הקבצים בעברית

## שלב 1: יצירת שירות PostgreSQL
1. היכנס ל-Railway Dashboard
2. לחץ על "New Project" 
3. בחר "Add Service" -> "Database" -> "PostgreSQL"
4. המתן שהמסד יווצר ויקבל כתובת

## שלב 2: הגדרת משתני הסביבה עבור האפליקציה
1. בחר את השירות של האפליקציה (לא המסד נתונים)
2. לך ל"Variables" tab
3. הוסף את המשתנים הבאים:

### משתני סביבה נדרשים:
```
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
PORT=3001
```

### חיבור למסד נתונים:
Railway יוסיף אוטומטי את `DATABASE_URL` כשתחבר את השירותים.

## שלב 3: חיבור השירותים
1. בעמוד הראשי של הפרויקט, תראה את שני השירותים
2. גרור חיבור בין השירות PostgreSQL לשירות האפליקציה
3. זה יוסיף אוטומטי את `DATABASE_URL` למשתני הסביבה

## שלב 4: פריסה (Deploy)
1. דחוף את הקוד החדש לגיט:
   ```bash
   git add .
   git commit -m "Fix API URL for Railway deployment"
   git push origin main
   ```
2. Railway יזהה את השינויים ויתחיל build אוטומטי

## שלב 5: בדיקת הפריסה
1. המתן לסיום ה-build (כמה דקות)
2. לחץ על URL שRailway יוצר עבור האפליקציה
3. נסה להירשם ולהתחבר

## פתרון בעיות נפוצות:
- אם יש שגיאת 500: בדוק את ה-logs בRailway
- אם אין חיבור למסד: וודא ש-DATABASE_URL מוגדר
- אם האתר לא נטען: בדוק שה-PORT מוגדר כ-3001

## קישורים חשובים:
- Dashboard: https://railway.app/dashboard
- Logs: לחץ על השירות ואז "Logs" tab
- Variables: לחץ על השירת ואז "Variables" tab