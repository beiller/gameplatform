#!/usr/bin/env python
import SimpleHTTPServer

class MyHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_my_headers()

        SimpleHTTPServer.SimpleHTTPRequestHandler.end_headers(self)

    def send_my_headers(self):
		self.send_header('Access-Control-Allow-Credentials', 'true');
		self.send_header('Access-Control-Allow-Methods', 'GET');
		self.send_header("Access-Control-Allow-Origin", "http://cv.phncdn.com")


if __name__ == '__main__':
    SimpleHTTPServer.test(HandlerClass=MyHTTPRequestHandler)
