Action()
{


	lr_rendezvous("login");


	web_reg_find("Text=\"code\": 200,",
		LAST);

	
	web_reg_save_param("token1",
		"LB=\"token\": \"",
		"RB=\"",
		LAST);

	lr_start_transaction("��¼");

	web_custom_request("web_custom_request",
		"URL=http://132.232.44.158:5000/userLogin/",
		"Method=POST",
		"TargetFrame=",
		"Resource=0",
		"Referer=",
		"EncType=application/json",
		"Body={\"username\":\"{account}\", \"password\":\"{password}\", \"captcha\":\"123456\"}",
		LAST);

	lr_end_transaction("��¼", LR_AUTO);


	// ˼��ʱ��
	// lr_think_time(5);


	web_reg_find("Text=\"code\": 200,",
		LAST);

	lr_start_transaction("�ظ�����");

	web_custom_request("web_custom_request",
		"URL=http://132.232.44.158:5000/articleComment/",
		"Method=POST",
		"TargetFrame=",
		"Resource=0",
		"Referer=",
		"EncType=application/json",
		"Body={\"id\":1, \"content\":\"no reapte!\",\"token\": \"{token1}\"}",
		LAST);

	lr_end_transaction("�ظ�����", LR_AUTO);



	


	return 0;
}
