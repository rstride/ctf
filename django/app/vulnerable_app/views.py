from django.http import HttpResponse
from django.db import connection
from django.shortcuts import render

def search(request):
    query = request.GET.get('q', '')
    sql_query = f"SELECT * FROM auth_user WHERE username = '{query}'"
    cursor = connection.cursor()
    cursor.execute(sql_query)
    result = cursor.fetchall()
    return render(request, 'search.html', {'result': result})
