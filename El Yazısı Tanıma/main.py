from tensorflow.examples.tutorials.mnist import input_data
mnist = input_data.read_data_sets("MNIST_data/", one_hot=True)

import tensorflow as tf
import load_image

x = tf.placeholder(tf.float32, [None, 784])

W = tf.Variable(tf.zeros([784, 10]))
b = tf.Variable(tf.zeros([10]))

y = tf.nn.softmax(tf.matmul(x, W) + b)

y2 = tf.placeholder(tf.float32, [None, 10])

c_entropy = tf.reduce_mean(-tf.reduce_sum(y2 * tf.log(y), reduction_indices=[1]))

train_step = tf.train.GradientDescentOptimizer(0.5).minimize(c_entropy)

sess = tf.InteractiveSession()

tf.global_variables_initializer().run()

for _ in range(1000):
  batch_xs, batch_ys = mnist.train.next_batch(100)
  sess.run(train_step, feed_dict={x: batch_xs, y2: batch_ys})

correct_prediction = tf.equal(tf.argmax(y,1), tf.argmax(y2,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

im = load_image.read_image("eight.png")
mat = load_image.proc_image(im)
sixes = [mat for _ in range(10000)]

print(sess.run(tf.argmax(y, 1), feed_dict={x: sixes})[0])
