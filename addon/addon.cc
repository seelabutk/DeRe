#include <napi.h>
#include <windows.h>
#include <iostream>
#include <vector>
#include <string>



Napi::Number Method(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, 10);
}

Napi::Value getWindowText(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();

  if(info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments");
    return env.Null();
  }

  if(!info[0].IsNumber()){
    Napi::TypeError::New(env, "argument must be integer").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND hwnd = (HWND)info[0].As<Napi::Number>().Int64Value();
  int len = GetWindowTextLength(hwnd) + 1;
  std::vector<char> buf(len);
  GetWindowText(hwnd, &buf[0], len);
  std::string txt = &buf[0];

  return Napi::String::New(env, txt);
}

Napi::Number getForegroundWindow(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  return Napi::Number::New(env, (uint64_t)GetForegroundWindow());
}

Napi::Value getClientRect(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();

  if(info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments");
    return env.Null();
  }

  if(!info[0].IsNumber()){
    Napi::TypeError::New(env, "argument must be integer").ThrowAsJavaScriptException();
    return env.Null();
  }

  RECT rect;
  HWND hwnd = (HWND)info[0].As<Napi::Number>().Int64Value();
  if(!GetClientRect(hwnd, &rect))
    return env.Null();

  Napi::Object obj = Napi::Object::New(env);
  obj.Set(Napi::String::New(env, "left"  ), Napi::Number::New(env, rect.left  ));
  obj.Set(Napi::String::New(env, "top"   ), Napi::Number::New(env, rect.top   ));
  obj.Set(Napi::String::New(env, "right" ), Napi::Number::New(env, rect.right ));
  obj.Set(Napi::String::New(env, "bottom"), Napi::Number::New(env, rect.bottom));
  return obj;
}

//https://stackoverflow.com/questions/26233848/c-read-pixels-with-getdibits
//https://docs.microsoft.com/en-us/windows/win32/gdi/capturing-an-image
//https://social.msdn.microsoft.com/Forums/vstudio/en-US/d08a599a-e1cc-4219-b76b-5bd0b4ea58d1/win32-how-use-getdibits-and-setdibits?forum=vclanguage
Napi::Value printWindow(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  HWND hwnd;
  RECT rect;
  HDC hdcWindow = NULL;
  HDC hdc = NULL;
  HBITMAP hbmp = NULL;
  int width, height;

  if(info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments");
    return env.Null();
  }

  if(!info[0].IsNumber()){
    Napi::TypeError::New(env, "argument must be integer").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  hwnd = (HWND)info[0].As<Napi::Number>().Int64Value();
  
  GetClientRect(hwnd, &rect);
  width = rect.right - rect.left;
  height = rect.bottom - rect.top;
  
  hdcWindow = GetDC(0);
  hdc = CreateCompatibleDC(hdcWindow);
  hbmp = CreateCompatibleBitmap(hdcWindow, width, height);
  if(!hbmp){
    Napi::TypeError::New(env, "failed to create compatible bitmap");
    return env.Null();
  }
    
  HGDIOBJ hOld = SelectObject(hdc, hbmp);
  BitBlt(hdc, rect.left, rect.top, width, height, hdcWindow, 0, 0, SRCCOPY|CAPTUREBLT);
  SelectObject(hdc, hOld);
  DeleteDC(hdc);
  
  BITMAPINFO bmInfo = {0};
  bmInfo.bmiHeader.biSize = sizeof(bmInfo.bmiHeader);
  if(!GetDIBits(hdcWindow, hbmp, 0, 0, NULL, &bmInfo, DIB_RGB_COLORS)){
    Napi::TypeError::New(env, "failed to getDIBits").ThrowAsJavaScriptException();
    return env.Null();
  }

  bmInfo.bmiHeader.biCompression = BI_RGB;
  bmInfo.bmiHeader.biHeight = -bmInfo.bmiHeader.biHeight;
  bmInfo.bmiHeader.biBitCount = 32;
  size_t bitmapSize = bmInfo.bmiHeader.biSizeImage;
  BYTE *pixels = new BYTE[bitmapSize];

  if(!GetDIBits(hdcWindow, hbmp, 0, bmInfo.bmiHeader.biHeight, pixels, &bmInfo, DIB_RGB_COLORS)){
    Napi::TypeError::New(env, "failed to getDIBits").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, pixels, bitmapSize,
    [](Napi::Env env, void* finalizeData){
      delete[] static_cast<BYTE*>(finalizeData);
    });

  Napi::Object obj = Napi::Object::New(env);
  obj.Set(Napi::String::New(env, "width" ), Napi::Number::New(env, width  ));
  obj.Set(Napi::String::New(env, "height"), Napi::Number::New(env, height ));
  obj.Set(Napi::String::New(env, "data"  ), Napi::Uint8Array::New(env, bitmapSize, buffer, 0));
  //DeleteObject(hbmp);
  //ReleaseDC(hwnd, hdcWindow);

  return obj;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "fn"),
    Napi::Function::New(env, Method));

  exports.Set(Napi::String::New(env, "GetWindowText"),
    Napi::Function::New(env, getWindowText));
  
  exports.Set(Napi::String::New(env, "GetForegroundWindow"),
    Napi::Function::New(env, getForegroundWindow));

  exports.Set(Napi::String::New(env, "GetClientRect"),
    Napi::Function::New(env, getClientRect));

  exports.Set(Napi::String::New(env, "PrintWindow"),
    Napi::Function::New(env, printWindow));

  return exports;
}

NODE_API_MODULE(addon, Init)