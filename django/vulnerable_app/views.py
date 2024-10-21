from django.shortcuts import render
from django.http import HttpResponse
from django.db import connection

def vulnerable_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        # Vulnerable raw SQL query
        query = f"SELECT * FROM auth_user WHERE username = '{username}' AND password = '{password}';"
        with connection.cursor() as cursor:
            cursor.execute(query)
            user = cursor.fetchone()

        if user:
            return HttpResponse("Login successful! Flag: FLAG{SQL_INJECTION_SUCCESS}")
        else:
            return HttpResponse("Login failed.")
    
    return render(request, 'vulnerable_app/login.html')
