using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovingWindmill : MonoBehaviour
{
    public float speed;
    float initVal, prevVal;
    float direction, x, totalX ;
    int disableFrame = 10;

    public void Start()
    {
        direction = -1;
        initVal = transform.eulerAngles.z;
        x = initVal + x;
    }
    //moving the object with the defined speed
    private void Update()
    {
        //Debug.Log("initval : "+ initVal + " Curr : " + transform.eulerAngles.z + " prev : " + prevVal);
//        if (disableFrame < 0 && ((direction == -1 && 0 > transform.eulerAngles.z - initVal) || (direction == 1 && 360 < transform.eulerAngles.z - initVal)))
        //if(transform.eulerAngles.z > initVal-3f && transform.eulerAngles.z < initVal + 3f)
        //{
        //    direction = -1 * direction;
        //    //disableFrame = 10;
        //}

        //prevVal = transform.eulerAngles.z;
        //transform.Rotate(0, 0, direction * speed, Space.World);
        if (direction == 1 && x > 360+ initVal)
        {
            direction = -1 * direction;
        }
        else if(direction == -1  && x < 0 + initVal)
            direction = -1 * direction;
        
        x += direction * Time.deltaTime * 90;
        Debug.Log("x : " + x);
        transform.rotation = Quaternion.Euler(0, 0, x);
        //disableFrame--;
    }
}
