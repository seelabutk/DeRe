#include <uv.h>
#include <napi.h>

#include <windows.h>
#include <iostream>
#include <vector>
#include <string>

#define HOOK_EVENT WM_APP + 1
#define UNHOOK_EVENT WM_APP + 2

//global hook info
struct window_info {
  HWND hwnd;
  HWND overlay_hwnd;
  //global hoooks
  HWINEVENTHOOK g_foreground_hook;
  HWINEVENTHOOK g_minimize_hook;
  //application hooks
  HWINEVENTHOOK move_hook;
  HWINEVENTHOOK kill_hook;
  HWINEVENTHOOK name_hook;

  DWORD threadId;
  HANDLE event_handle;
};

//basic windows api bindings
Napi::Value getWindowText(const Napi::CallbackInfo&);
Napi::Number getForegroundWindow(const Napi::CallbackInfo&);
Napi::Value getClientRect(const Napi::CallbackInfo&);
Napi::Value getWindowRect(const Napi::CallbackInfo&);
Napi::Value printWindow(const Napi::CallbackInfo&);

//hook bindings
Napi::Boolean init(const Napi::CallbackInfo&);
Napi::Value setWindowNew(const Napi::CallbackInfo&);

//internal use
VOID CALLBACK hook_proc(HWINEVENTHOOK, DWORD, HWND, LONG, LONG, DWORD, DWORD);
void set_global_hooks(window_info*);
void set_application_hooks(window_info*);
void unset_global_hooks(window_info*);
void unset_application_hooks(window_info*);
void hook_thread(void*);

//callback handlers
void handle_foreground();
void handle_movesize();
void handle_namechange();


//todo: use getClientRect + getWindowRect to figure out screen coordinates of windows with aero theme backgrounds enabled

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

Napi::Value getWindowRect(const Napi::CallbackInfo &info){
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
  if(!GetWindowRect(hwnd, &rect))
    return env.Null();

  Napi::Object obj = Napi::Object::New(env);
  obj.Set(Napi::String::New(env, "left"  ), Napi::Number::New(env, rect.left));
  obj.Set(Napi::String::New(env, "top"   ), Napi::Number::New(env, rect.top));
  obj.Set(Napi::String::New(env, "right" ), Napi::Number::New(env, rect.right));
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
  BITMAP bmp;
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
  
  GetWindowRect(hwnd, &rect);
  rect.left += 4;  
  rect.top += 4; 
  rect.right -= 4; 
  rect.bottom -= 4;
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
  BitBlt(hdc, -rect.left, -rect.top, width + rect.left, height + rect.top, hdcWindow, 0, 0, SRCCOPY|CAPTUREBLT);
  SelectObject(hdc, hOld);
  DeleteDC(hdc);
  
  GetObject(hbmp, sizeof(BITMAP), &bmp);
  BITMAPINFOHEADER   bi;

  bi.biSize = sizeof(BITMAPINFOHEADER);
  bi.biWidth = bmp.bmWidth;
  bi.biHeight = -bmp.bmHeight;
  bi.biPlanes = 1;
  bi.biBitCount = 32;
  bi.biCompression = BI_RGB;
  bi.biSizeImage = 0;
  bi.biXPelsPerMeter = 0;
  bi.biYPelsPerMeter = 0;
  bi.biClrUsed = 0;
  bi.biClrImportant = 0;

  size_t bitmapSize = ((bmp.bmWidth * bi.biBitCount + 31) / 32) * 4 * bmp.bmHeight;
  BYTE *pixels = new BYTE[bitmapSize];

  if(!GetDIBits(hdcWindow, hbmp, 0, bi.biHeight, pixels, (BITMAPINFO*)&bi, DIB_RGB_COLORS)){
    Napi::TypeError::New(env, "failed to getDIBits").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  for(int i = 0; i < bitmapSize; i+=4){
    BYTE tmp = pixels[i+0];
    pixels[i+0] = pixels[i+2];
    pixels[i+2] = tmp;
  }
  
  Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, pixels, bitmapSize,
    [](Napi::Env env, void* finalizeData){
      delete[] static_cast<BYTE*>(finalizeData);
    });

  Napi::Object obj = Napi::Object::New(env);
  obj.Set(Napi::String::New(env, "width" ), Napi::Number::New(env, width  ));
  obj.Set(Napi::String::New(env, "height"), Napi::Number::New(env, height ));
  obj.Set(Napi::String::New(env, "data"  ), Napi::Uint8Array::New(env, bitmapSize, buffer, 0));
  DeleteObject(hbmp);
  ReleaseDC(hwnd, hdcWindow);

  return obj;
}




Napi::Boolean init(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  window_info *hook_info = static_cast<window_info*>(info.Data());

  //get electron hwnd
  if(info.Length() < 1 || info.Length() > 2) {
    Napi::TypeError::New(env, "Wrong number of arguments");
    return Napi::Boolean::New(env, false);
  }

  if(!info[0].IsNumber()){
    Napi::TypeError::New(env, "argument must be integer").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }

  if(info.Length() == 2){
    if(!info[1].IsNumber()){
      Napi::TypeError::New(env, "argument must be integer").ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    hook_info->hwnd = (HWND)info[1].As<Napi::Number>().Int64Value();
  } else {
    hook_info->hwnd = GetForegroundWindow();
  }

  hook_info->overlay_hwnd = (HWND)info[0].As<Napi::Number>().Int64Value();

  /* hook_info->event_handle = CreateEvent(nullptr, FALSE, FALSE, nullptr);
  uv_thread_t hook_tid;
  uv_thread_create(&hook_tid, hook_thread, static_cast<void*>(hook_info));
  WaitForSingleObject(hook_info->event_handle, INFINITE); */

  return Napi::Boolean::New(env, true);
}

Napi::Value setWindowNew(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  window_info *hook_info = static_cast<window_info*>(info.Data());

  if(info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments");
    return Napi::Boolean::New(env, false);
  }

  if(!info[0].IsNumber()){
    Napi::TypeError::New(env, "argument must be integer").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }

  hook_info->hwnd = (HWND)info[0].As<Napi::Number>().Int64Value();
  PostThreadMessage(hook_info->threadId, UNHOOK_EVENT, 0, 0);
  PostThreadMessage(hook_info->threadId, HOOK_EVENT  , 0, 0);

  return Napi::Boolean::New(env, true);
}

void handle_foreground(){
  std::cout << "Window Foreground!" << std::endl;
}
void handle_movesize(){
  std::cout << "Window Moved!" << std::endl;
}
void handle_namechange(){
  std::cout << "namechange!?" << std::endl;
}

//handle hooks
VOID CALLBACK hook_proc(HWINEVENTHOOK hWinEventHook, DWORD event, HWND hwnd, LONG idObject, LONG idChild, DWORD idEventThread, DWORD dwmsEventTime){
  if(idObject != OBJID_WINDOW || idChild != CHILDID_SELF){
    return;
  }
  
  switch(event){
    case EVENT_SYSTEM_FOREGROUND:
      handle_foreground();
      break;
    case EVENT_OBJECT_LOCATIONCHANGE:
      handle_movesize();
      break;
    case EVENT_OBJECT_NAMECHANGE:
      handle_namechange();
      break;
  }
}

void set_global_hooks(window_info *hook_info){
  hook_info->g_foreground_hook = (
    EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND,
    NULL, hook_proc, 0, 0, WINEVENT_OUTOFCONTEXT);
  hook_info->g_minimize_hook = (
    EVENT_SYSTEM_MINIMIZEEND, EVENT_SYSTEM_MINIMIZEEND,
    NULL, hook_proc, 0, 0, WINEVENT_OUTOFCONTEXT);
}
void set_application_hooks(window_info *hook_info){
  DWORD pid;
  DWORD threadId = GetWindowThreadProcessId(hook_info->hwnd, &pid);
  if(threadId == 0) return;
  
  hook_info->move_hook = SetWinEventHook(
    EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE,
    NULL, hook_proc, 0, threadId, WINEVENT_OUTOFCONTEXT);
  hook_info->kill_hook = SetWinEventHook(
    EVENT_OBJECT_DESTROY, EVENT_OBJECT_DESTROY,
    NULL, hook_proc, 0, threadId, WINEVENT_OUTOFCONTEXT);
  hook_info->name_hook = SetWinEventHook(
    EVENT_OBJECT_NAMECHANGE, EVENT_OBJECT_NAMECHANGE,
    NULL, hook_proc, 0, threadId, WINEVENT_OUTOFCONTEXT);
}
void unset_global_hooks(window_info *hook_info){
  if(hook_info->g_foreground_hook) UnhookWinEvent(hook_info->g_foreground_hook);
  if(hook_info->g_minimize_hook  ) UnhookWinEvent(hook_info->g_minimize_hook);
}
void unset_application_hooks(window_info *hook_info){
  if(hook_info->move_hook)  UnhookWinEvent(hook_info->move_hook);
  if(hook_info->kill_hook)  UnhookWinEvent(hook_info->kill_hook);
  if(hook_info->name_hook)  UnhookWinEvent(hook_info->name_hook);
}

//setup hooks
void hook_thread(void* arg){

  window_info *hook_info = static_cast<window_info*>(arg);
  hook_info->threadId = GetCurrentThreadId();
  SetEvent(hook_info->event_handle);

  set_global_hooks(hook_info);
  
  MSG msg;
  while(GetMessageW(&msg, (HWND)NULL, 0, 0) != FALSE){
    switch(msg.message){
      case HOOK_EVENT:
        set_application_hooks(hook_info);
        break;
      case UNHOOK_EVENT:
        unset_application_hooks(hook_info);
        break;
    }
    /* TranslateMessage(&msg);
    DispatchMessageW(&msg); */
  }

  unset_global_hooks(hook_info);
  unset_application_hooks(hook_info);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  
  //create global hook info object
  static window_info hook_info = {};

  //create api bindings
  exports.Set(Napi::String::New(env, "GetWindowText"),
    Napi::Function::New(env, getWindowText));
  
  exports.Set(Napi::String::New(env, "GetForegroundWindow"),
    Napi::Function::New(env, getForegroundWindow));

  exports.Set(Napi::String::New(env, "GetClientRect"),
    Napi::Function::New(env, getClientRect));

  exports.Set(Napi::String::New(env, "GetWindowRect"),
    Napi::Function::New(env, getWindowRect));

  exports.Set(Napi::String::New(env, "PrintWindow"),
    Napi::Function::New(env, printWindow));

  exports.Set(Napi::String::New(env, "init"),
    Napi::Function::New(env, init, nullptr, static_cast<void*>(&hook_info))); //not getting correct &hook_info addr?...
    
  exports.Set(Napi::String::New(env, "SetWatchWindow"),
    Napi::Function::New(env, setWindowNew, nullptr, static_cast<void*>(&hook_info)));

  hook_info.event_handle = CreateEvent(nullptr, FALSE, FALSE, nullptr);
  uv_thread_t hook_tid;
  uv_thread_create(&hook_tid, hook_thread, static_cast<void*>(&hook_info));
  WaitForSingleObject(hook_info.event_handle, INFINITE);

  return exports;
}

NODE_API_MODULE(addon, Init)