let timerId = null
let interval = 25

onmessage = function (e) {
  if (e.data === 'start') {
    timerId = setInterval(() => postMessage('tick'), interval)
  } else if (e.data === 'stop') {
    clearInterval(timerId)
    timerId = null
  } else if (e.data.interval) {
    interval = e.data.interval
    if (timerId) {
      clearInterval(timerId)
      timerId = setInterval(() => postMessage('tick'), interval)
    }
  }
}
