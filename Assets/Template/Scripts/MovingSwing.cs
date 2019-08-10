using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovingSwing : MonoBehaviour
{
    public float speed;
    public bool isRight;
    public bool isPositive;
    public void Start()
    {
        
    }
    //moving the object with the defined speed
    private void Update()
    {
        float z = gameObject.transform.eulerAngles.z;
        if (isRight) {
            Debug.Log("Right z : " + z);
            if (z > 90 && z < 135)
                isPositive = false;
            else if(z < 90 && z > 45)
                isPositive = true;

            if (isPositive)
            {
                transform.Rotate(0, 0, -1 * speed, Space.World);
            }else
                transform.Rotate(0, 0, speed, Space.World);
        }
        else
        {
            if (z < 270 && z > 225)
                isPositive = false;
            else if (z < 315 && z > 270)
                isPositive = true;

            if (isPositive)
            {
                transform.Rotate(0, 0,  speed, Space.World);
            }
            else
                transform.Rotate(0, 0, -1 * speed, Space.World);
        }
    }
}
