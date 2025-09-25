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
כאשר מחברים את השירותים, Railway יכול להוסיף את משתני הסביבה בשתי דרכים:

**אופציה 1**: משתנה `DATABASE_URL` (מומלץ לבדוק אם הוא קיים)
**אופציה 2**: משתנים נפרדים: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`

## שלב 3: חיבור השירותים
1. בעמוד הראשי של הפרויקט, תראה את שני השירותים
2. גרור חיבור בין השירות PostgreSQL לשירות האפליקציה (חץ מ-PostgreSQL לאפליקציה)
3. וודא שהמשתנים הוגדרו:
   - לחץ על "Variables" בשירות האפליקציה
   - בדוק שיש לפחות אחד מאלה:
     - `DATABASE_URL` (מחרוזת חיבור מלאה), או
     - כל המשתנים: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`

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

## שלב מיוחד: הוספת PGPASSWORD
במקרה שמופיעה שגיאת "password authentication failed for user postgres":
1. לך לשירות PostgreSQL ב-Railway
2. לחץ על "Connect" בתפריט העליון
3. העתק את מחרוזת החיבור (Connection String)
4. חלץ את הסיסמה מתוך המחרוזת (הערך שבין @ ל-/)
   - מבנה כללי: `postgresql://postgres:PASSWORD@containers-us-west...`
5. לך לשירות האפליקציה ב-Railway
6. לחץ על "Variables"
7. הוסף משתנה חדש:
   - שם: `PGPASSWORD`
   - ערך: הסיסמה שהעתקת
8. לחץ "Add" והמתן ל-deploy חדש

## פתרון בעיות נפוצות:
- אם יש שגיאת 500: בדוק את ה-logs בRailway
- אם מופיעה שגיאת "password authentication failed": בצע את שלב הוספת PGPASSWORD למעלה
- אם אין חיבור למסד: וודא ש-DATABASE_URL או לחלופין PGHOST, PGUSER, PGPASSWORD מוגדרים
- אם מופיעה שגיאת "no PostgreSQL user name specified": וודא שהמשתנה PGUSER קיים והוא מוגדר נכון
- אם האתר לא נטען: בדוק שה-PORT מוגדר כ-3001

## קישורים חשובים:
- Dashboard: https://railway.app/dashboard
- Logs: לחץ על השירות ואז "Logs" tab
- Variables: לחץ על השירת ואז "Variables" tab