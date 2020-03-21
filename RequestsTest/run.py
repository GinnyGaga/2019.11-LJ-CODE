"""
    1.读取excel中的测试用例
    2.循环读取执行每一个测试用例
"""
import requests
from utils.exceltool import read_excel

# 1. 读取excel
sheet_name = "注册模块"
excel_path = "C:\\Users\\SNake\\VSCodeProjects\\ljtest201910\\RequestsTest\\cases\\lux项目接口测试用例.xlsx"
res = read_excel(excel_path, sheet_name)

# 2. 循环执行每一个测试用例
for i in res:
    # 2.1 取出所需参数
    url = i[3]              # 接口的地址
    data = eval(i[5])       # 请求的数据, eval把字符串转化成字典
    method = i[4]           # http的请求方法
    http_code = i[6]        # http的响应状态码
    result_code = i[7]      # 响应值的状态码

    case_name = i[1]        # 测试用例的名字

    # 2.2 构造请求，所有的请求数据，都是通过excel里面动态读取出来的
    r = requests.request(method=method, url=url, json=data)
    # 疑问1：如果是get方法怎么去处理参数
    # 疑问2：如果是post方法的form-data格式的参数，又怎么处理？
    # 疑问3：断言引擎的优化
    # 疑问4：测试用例的设计，如果设计到测试步骤，那怎么处理？接口之间的关联。

    try:
        # 2.3 断言http响应状态码
        assert r.status_code == http_code
        # 2.4 断言返回值
        assert result_code in r.text

        print("测试用例【{}】执行通过".format(case_name))
    except:
        print("测试用例【{}】执行失败".format(case_name))

    print("=====================================")