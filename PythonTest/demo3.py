import pymysql
'''
1、连接数据库
2、选择数据库
3、获取游标
3、增删改查
'''

def query(sql):
    '''
    这是数据库的查询方法。
    '''
    db = pymysql.connect(host="localhost",user="root",password="123456",db="testdb") # 连接并选择数据库
    cursor = db.cursor()  # 获取游标
    try:
        cursor.execute(sql) # 执行sql语句
        res = cursor.fetchall()  # 获得查询结果
        db.close()  # 关闭数据库连接
        return res
    except:
        return "SQL语句错误！请检查后再输入"


def commit(sql):
    '''
    这是数据库的修改方法。
    '''
    db = pymysql.connect(host="localhost",user="root",password="123456",db="testdb") # 连接并选择数据库
    cursor = db.cursor()  # 获取游标
    try:
        cursor.execute(sql) # 执行sql语句
        db.commit()  # 应用改变
        db.close()  # 关闭数据库连接
        return True
    except:
        return "SQL语句错误！请检查后再输入"
