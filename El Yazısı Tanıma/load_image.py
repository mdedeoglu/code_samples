import scipy.misc
from sys import argv

def read_image(image_path):
    mat = scipy.misc.imread(image_path, flatten=False, mode=None)
    print(mat)
    return mat


def proc_image(mat):
    arr = []
    for row in mat:
        for pixel in row:
            arr.append((sum(pixel) / len(pixel)) / 255)
    return arr

def main():
    im = read_image(argv[1])
    proced = proc_image(im)
    print(proced)
    print(len(proced))